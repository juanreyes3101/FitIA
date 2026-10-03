"""Ciclo MAPE-K (autonomic computing de IBM) sobre la tabla `metricas`.

  Monitor   → el middleware ya guarda latencia y errores; aquí se suman RPS, CPU/memoria (psutil) y la tasa de
              error de Gemini (solicitudes_ia).
  Analizar  → línea base (EWMA + σ) en la ventana → lineas_base; z del último intervalo → anomalias.
  Planificar→ politicas.py (enfriamiento y réplicas mín./máx.).
  Ejecutar  → SIMULADO: servicios.replicas_actuales/estado + acciones_remediacion.
  Verificar → al ciclo siguiente, si el valor volvió a la banda de SU línea base → MITIGADA.
  Knowledge → lineas_base + historial de anomalías y acciones.

Lo corre el worker (python -m app.monitoring.worker) y, para la demo, POST /monitoreo/simular-pico.
"""
import logging
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime, timedelta

from sqlalchemy import text

from app.monitoring import analisis, politicas
from app.repositories import monitoreo as repo

log = logging.getLogger(__name__)

METRICAS = ("LATENCIA_MS", "TASA_ERROR", "RPS", "CPU_PCT", "MEM_PCT")
CANDADO = "fitia_mape_k"


@dataclass(frozen=True)
class Parametros:
    intervalo_seg: int = 60
    ventana_min: int = 30
    umbral_z: float = 3.0
    umbral_error: float = 0.05
    enfriamiento_seg: int = 300

    @classmethod
    def desde_config(cls, cfg) -> "Parametros":
        return cls(intervalo_seg=cfg["MONITOR_INTERVAL_SEG"], ventana_min=cfg["MONITOR_VENTANA_MIN"],
                   umbral_z=cfg["MONITOR_Z_UMBRAL"], umbral_error=cfg["MONITOR_ERROR_UMBRAL"],
                   enfriamiento_seg=cfg["MONITOR_ENFRIAMIENTO_SEG"])


@contextmanager
def _candado(conn):
    """El worker y simular-pico nunca analizan a la vez (evita anomalías duplicadas)."""
    ok = conn.execute(text("SELECT GET_LOCK(:n, 5)"), {"n": CANDADO}).scalar()
    try:
        yield bool(ok)
    finally:
        if ok:
            conn.execute(text("SELECT RELEASE_LOCK(:n)"), {"n": CANDADO})


def _estado(fila) -> politicas.ServicioEstado:
    return politicas.ServicioEstado(fila.codigo, fila.replicas_actuales, fila.replicas_min, fila.replicas_max)


def _fuera_de_tramos(muestras, tramos, intervalo: timedelta):
    if not tramos:
        return muestras
    return [(t, v) for t, v in muestras if not any(ini - intervalo <= t <= fin for ini, fin in tramos)]


# ---------------------------------------------------------------- Monitor
def monitor(conn, p: Parametros, ahora: datetime, servicios) -> int:
    desde = ahora - timedelta(seconds=p.intervalo_seg)
    filas: list[dict] = []
    conteo = repo.contar_latencias(conn, desde, ahora)
    for s in servicios:
        if s.id in conteo:
            filas.append({"servicio_id": s.id, "metrica": "RPS", "valor": round(conteo[s.id] / p.intervalo_seg, 4),
                          "registrado_en": ahora})
        if s.codigo == "api":
            try:
                import psutil
                filas.append({"servicio_id": s.id, "metrica": "CPU_PCT", "valor": psutil.cpu_percent(interval=None),
                              "registrado_en": ahora})
                filas.append({"servicio_id": s.id, "metrica": "MEM_PCT", "valor": psutil.virtual_memory().percent,
                              "registrado_en": ahora})
            except ImportError:  # pragma: no cover
                log.warning("psutil no está instalado: no se mide CPU ni memoria")
        if s.codigo == "ia":
            errores, total = repo.tasa_error_ia(conn, desde, ahora)
            if total:
                filas.append({"servicio_id": s.id, "metrica": "TASA_ERROR", "valor": round(errores / total, 4),
                              "registrado_en": ahora})
    repo.insertar_metricas(conn, filas)
    return len(filas)


# ---------------------------------------------------------------- Ejecutar
def ejecutar(conn, servicio, anomalia_id: int, planes, ahora: datetime) -> list[dict]:
    hechas = []
    for plan in planes:
        if plan.replicas_despues is not None:
            repo.actualizar_servicio(conn, servicio.id, replicas_actuales=plan.replicas_despues)
        accion_id = repo.insertar_accion(conn, anomalia_id, plan, ahora)
        hechas.append({"id": accion_id, "anomalia_id": anomalia_id, "servicio": servicio.codigo, "tipo": plan.tipo,
                       "detalle": plan.detalle, "replicas_antes": plan.replicas_antes,
                       "replicas_despues": plan.replicas_despues})
        log.info("MAPE-K ejecutar: %s", plan.detalle)
    return hechas


# ---------------------------------------------------------------- Ciclo
def ejecutar_ciclo(conn, p: Parametros, ahora: datetime | None = None, servicios: list[str] | None = None,
                   metricas: tuple[str, ...] = METRICAS, con_monitor: bool = True) -> dict:
    ahora = ahora or datetime.now()
    resumen = {"ahora": ahora.isoformat(), "muestras_monitor": 0, "lineas_base": 0, "anomalias": [],
               "acciones": [], "mitigadas": []}
    with _candado(conn) as ok:
        if not ok:
            log.warning("Otro ciclo MAPE-K está en curso: se omite este")
            return resumen | {"omitido": True}
        filas_srv = repo.servicios(conn, servicios)
        por_id = {s.id: s for s in filas_srv}
        if con_monitor:
            resumen["muestras_monitor"] = monitor(conn, p, ahora, filas_srv)

        intervalo = timedelta(seconds=p.intervalo_seg)
        inicio_actual = ahora - intervalo
        inicio_ventana = ahora - timedelta(minutes=p.ventana_min)
        abiertas = [a for a in repo.anomalias_abiertas(conn, list(por_id)) if a.metrica in metricas]

        # Verificar: las anomalías del ciclo anterior, contra SU línea base (Knowledge)
        for an in abiertas:
            srv = por_id[an.servicio_id]
            x = analisis.valor_actual(repo.muestras(conn, srv.id, an.metrica, inicio_actual, ahora))
            base = repo.linea_base(conn, an.linea_base_id)
            if x is None or base is None:
                continue  # sin evidencia nueva: sigue abierta
            lb = analisis.LineaBase(float(base.media), float(base.desviacion), float(base.p95 or 0), base.muestras)
            if not analisis.es_anomalo(x, lb, an.metrica, p.umbral_z, p.umbral_error):
                repo.marcar_mitigada(conn, an.id)
                resumen["mitigadas"].append({"id": an.id, "servicio": srv.codigo, "metrica": an.metrica,
                                             "valor": round(x, 4)})
                log.info("MAPE-K verificar: anomalía %s (%s %s) MITIGADA", an.id, srv.codigo, an.metrica)
            else:
                srv = repo.servicio_por_codigo(conn, srv.codigo)
                plan = politicas.planificar_reintento(_estado(srv), an.metrica, repo.ultima_accion_en(conn, srv.id),
                                                      ahora, p.enfriamiento_seg)
                if plan:
                    resumen["acciones"] += ejecutar(conn, srv, an.id, [plan], ahora)
        siguen_abiertas = {(a.servicio_id, a.metrica) for a in abiertas
                           if a.id not in {m["id"] for m in resumen["mitigadas"]}}

        # Analizar → Planificar → Ejecutar
        for srv in filas_srv:
            for metrica in metricas:
                ventana = repo.muestras(conn, srv.id, metrica, inicio_ventana, ahora)
                if not ventana:
                    continue
                actuales = [(t, v) for t, v in ventana if t > inicio_actual]
                historicas = [(t, v) for t, v in ventana if t <= inicio_actual]
                tramos = repo.tramos_anomalos(conn, srv.id, metrica, inicio_ventana, ahora)
                base = analisis.linea_base(_fuera_de_tramos(historicas, tramos, intervalo), metrica)
                if base is None:
                    continue
                lb_id = repo.insertar_linea_base(conn, srv.id, metrica, base, p.ventana_min, ahora)
                resumen["lineas_base"] += 1
                x = analisis.valor_actual(actuales)
                if x is None or (srv.id, metrica) in siguen_abiertas:
                    continue
                det = analisis.detectar(x, base, metrica, p.umbral_z, p.umbral_error)
                if det is None:
                    continue
                an_id = repo.insertar_anomalia(conn, srv.id, lb_id, metrica, x, base.media, det.zscore,
                                               det.severidad, ahora)
                resumen["anomalias"].append({"id": an_id, "servicio": srv.codigo, "metrica": metrica,
                                             "valor_observado": round(x, 4), "valor_esperado": base.media,
                                             "desviacion": base.desviacion, "zscore": det.zscore,
                                             "severidad": det.severidad})
                log.info("MAPE-K analizar: %s %s z=%.2f (%s)", srv.codigo, metrica, det.zscore, det.severidad)
                actual = repo.servicio_por_codigo(conn, srv.codigo)
                planes = politicas.planificar(_estado(actual), metrica, det.severidad,
                                              repo.ultima_accion_en(conn, srv.id), ahora, p.enfriamiento_seg)
                resumen["acciones"] += ejecutar(conn, actual, an_id, planes, ahora)

        # Estado de cada servicio y, tras mitigar, devolver las réplicas extra
        for srv in filas_srv:
            con_abiertas = any(a.servicio_id == srv.id for a in repo.anomalias_abiertas(conn, [srv.id]))
            repo.actualizar_servicio(conn, srv.id, estado="DEGRADADO" if con_abiertas else "SALUDABLE")
            if con_abiertas:
                continue
            previo = repo.ultimo_escalado_mitigado(conn, srv.id)
            if previo:
                actual = repo.servicio_por_codigo(conn, srv.codigo)
                plan = politicas.planificar_retorno(_estado(actual), previo[1], repo.ultima_accion_en(conn, srv.id),
                                                    ahora, p.enfriamiento_seg)
                if plan:
                    resumen["acciones"] += ejecutar(conn, actual, previo[0], [plan], ahora)

        repo.podar_lineas_base(conn, ahora - timedelta(days=1))
    return resumen
