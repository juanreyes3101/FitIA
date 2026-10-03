"""Orquestador de POST /rutinas/generar (ver diagrama 03_secuencia_generar_rutina).

Defensa en profundidad (no quitar ninguna capa):
  1. A la IA solo se le pasa el catálogo de sp_ejercicios_seguros.
  2. Su respuesta pasa por ValidadorSeguridad (7 reglas) con hasta 2 reintentos.
  3. Al persistir, el trigger trg_rutina_ejercicio_seguro bloquea cualquier ejercicio contraindicado.
"""
import logging

from flask import current_app
from sqlalchemy import update
from sqlalchemy.exc import DBAPIError

from app.ai.base import AdaptadorIA, ErrorProveedorIA, ResultadoIA
from app.ai.cache import CacheTTL, clave_cache
from app.ai.circuit_breaker import CircuitBreaker
from app.ai.mock import MockProvider
from app.ai.schema import EjercicioCatalogo
from app.db import engine, tabla
from app.errors import ApiError, es_error_trigger
from app.repositories import ejercicios as repo_ej
from app.repositories import monitoreo as repo_mon
from app.repositories import rutinas as repo
from app.repositories import solicitudes_ia as repo_sia
from app.services.perfil import perfil_anonimo
from app.services.validador import ContextoValidacion, ValidadorSeguridad

log = logging.getLogger(__name__)
MAX_REINTENTOS = 2


class ServicioIA:
    """Estado de proceso de la IA (vive en app.extensions, no como singleton de módulo)."""
    def __init__(self, config):
        self.config = config
        self.breaker = CircuitBreaker(max_fallos=3, enfriamiento_seg=300)
        self.cache = CacheTTL(ttl_seg=24 * 3600)
        self.mock = MockProvider()
        self._gemini: AdaptadorIA | None = None

    def gemini(self) -> AdaptadorIA:
        if self._gemini is None:
            from app.ai.gemini import GeminiProvider
            self._gemini = GeminiProvider(self.config["GEMINI_API_KEY"], self.config["GEMINI_MODEL"],
                                          self.config["IA_TIMEOUT_SEG"])
        return self._gemini


def servicio_ia() -> ServicioIA:
    return current_app.extensions["fitia_ia"]


def _registrar(usuario_id: int, proveedor: str, modelo: str, estado: str, **kw) -> None:
    with engine().begin() as conn:
        repo_sia.registrar(conn, usuario_id, proveedor, modelo, estado, **kw)


def _elegir_proveedor(svc: ServicioIA, usuario_id: int) -> AdaptadorIA:
    if current_app.config["AI_PROVIDER"] != "gemini":
        return svc.mock
    with engine().connect() as conn:
        if repo_sia.total_hoy(conn) >= current_app.config["IA_MAX_SOLICITUDES_DIA"]:
            log.warning("Límite diario de IA alcanzado: se usa Mock")
            return svc.mock
        if repo_mon.ia_forzada_a_mock(conn):
            log.info("El monitor MAPE-K pasó la IA a Mock (anomalía abierta en el servicio ia)")
            return svc.mock
    if not svc.breaker.permite():
        return svc.mock
    try:
        return svc.gemini()
    except ErrorProveedorIA as exc:
        svc.breaker.registrar_fallo(abrir_ya=True)
        _registrar(usuario_id, "gemini", current_app.config["GEMINI_MODEL"], "ERROR", detalle_error=str(exc))
        return svc.mock


def _generar_validada(svc: ServicioIA, proveedor: AdaptadorIA, usuario_id: int, perfil, catalogo,
                      ctx: ContextoValidacion) -> ResultadoIA | None:
    validador = ValidadorSeguridad()
    errores_previos: list[str] | None = None
    for _ in range(1 + MAX_REINTENTOS):
        try:
            resultado = proveedor.generar(perfil, catalogo, errores_previos)
        except ErrorProveedorIA as exc:
            if proveedor is not svc.mock:
                svc.breaker.registrar_fallo(abrir_ya=exc.abre_breaker_ya)
            _registrar(usuario_id, proveedor.nombre, getattr(proveedor, "modelo", "?"), "ERROR",
                       detalle_error=str(exc))
            return None
        errores = validador.validar(resultado.rutina, ctx)
        if not errores:
            if proveedor is not svc.mock:
                svc.breaker.registrar_exito()
            return resultado
        log.info("Rutina rechazada por el validador: %s", errores)
        _registrar(usuario_id, resultado.proveedor, resultado.modelo, "RECHAZADA_VALIDACION",
                   latencia_ms=resultado.latencia_ms, tokens_entrada=resultado.tokens_entrada,
                   tokens_salida=resultado.tokens_salida, detalle_error=" | ".join(errores))
        errores_previos = errores
        if proveedor is svc.mock:  # Mock es determinista: reintentar no cambia nada
            return None
    return None


def generar(usuario_id: int) -> tuple[dict, int]:
    svc = servicio_ia()
    with engine().connect() as conn:
        perfil = perfil_anonimo(conn, usuario_id)
        catalogo = [EjercicioCatalogo.model_validate(dict(f._mapping)) for f in repo_ej.seguros(conn, usuario_id)]
        ctx = ContextoValidacion(perfil=perfil, catalogo={e.id: e for e in catalogo},
                                 contraindicaciones=repo_ej.contraindicaciones_por_ejercicio(conn),
                                 ejercicios_existentes=repo_ej.ids_existentes(conn))
    if not catalogo:
        raise ApiError("SIN_EJERCICIOS_SEGUROS", "No hay ejercicios seguros para tu perfil. Habla con tu entrenador.", 422)

    # Caché 24 h: no gasta cupo ni se registra en solicitudes_ia (no hubo llamada a la IA)
    clave = clave_cache(usuario_id, perfil, catalogo)
    en_cache = svc.cache.obtener(clave)
    if en_cache:
        with engine().connect() as conn:
            detalle = repo.detalle(conn, en_cache["rutina_id"])
        if detalle and detalle["estado"] in repo.VIGENTES:
            return detalle | {"explicacion": en_cache["explicacion"], "proveedor": en_cache["proveedor"],
                              "desde_cache": True}, 200

    with engine().connect() as conn:
        if repo_sia.cupo_restante(conn, usuario_id) <= 0:
            raise ApiError("CUPO_IA_AGOTADO", "Ya usaste todas tus rutinas con IA de este mes. "
                                              "Pásate a FitIA Pro para generar más.", 402)

    proveedor = _elegir_proveedor(svc, usuario_id)
    resultado = _generar_validada(svc, proveedor, usuario_id, perfil, catalogo, ctx)
    if resultado is None and proveedor is not svc.mock:
        resultado = _generar_validada(svc, svc.mock, usuario_id, perfil, catalogo, ctx)
    if resultado is None:
        raise ApiError("RUTINA_NO_SEGURA", "No pudimos armar una rutina segura para tu perfil. "
                                           "Habla con tu entrenador.", 422)

    try:
        with engine().begin() as conn:
            r = tabla("rutinas")
            conn.execute(update(r).where(r.c.usuario_id == usuario_id, r.c.estado == "VALIDADA")
                         .values(estado="ARCHIVADA"))
            rutina_id = repo.crear_completa(conn, usuario_id, resultado.rutina, perfil.objetivo, estado="VALIDADA")
            repo.cambiar_estado(conn, rutina_id, "VALIDADA", observaciones=resultado.rutina.explicacion)
            repo_sia.registrar(conn, usuario_id, resultado.proveedor, resultado.modelo, "OK", rutina_id=rutina_id,
                               latencia_ms=resultado.latencia_ms, tokens_entrada=resultado.tokens_entrada,
                               tokens_salida=resultado.tokens_salida)
    except DBAPIError as exc:
        if not es_error_trigger(exc):
            raise
        mensaje = str(exc.orig.args[1])
        _registrar(usuario_id, resultado.proveedor, resultado.modelo, "RECHAZADA_VALIDACION",
                   detalle_error=f"Trigger: {mensaje}")
        raise ApiError("EJERCICIO_CONTRAINDICADO", f"La base de datos bloqueó la rutina: {mensaje}.", 422) from exc

    svc.cache.guardar(clave, {"rutina_id": rutina_id, "explicacion": resultado.rutina.explicacion,
                              "proveedor": resultado.proveedor})
    with engine().connect() as conn:
        detalle = repo.detalle(conn, rutina_id)
    return detalle | {"explicacion": resultado.rutina.explicacion, "proveedor": resultado.proveedor,
                      "desde_cache": False}, 201


def activa(usuario_id: int) -> dict:
    with engine().connect() as conn:
        rutina_id = repo.vigente(conn, usuario_id)
        if not rutina_id:
            raise ApiError("SIN_RUTINA", "Todavía no tienes una rutina. Genera una con IA.", 404)
        return repo.detalle(conn, rutina_id)
