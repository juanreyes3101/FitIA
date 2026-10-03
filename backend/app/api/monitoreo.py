"""Consola de monitoreo: lecturas de la bitácora MAPE-K y el disparador de la demo."""
from datetime import datetime, timedelta

from flask import Blueprint, current_app, jsonify, request

from app.api.esquemas import SimularPico, cuerpo, param_num
from app.db import a_json, engine, filas_dict
from app.errors import ApiError
from app.middleware.auth_jwt import requiere_rol
from app.monitoring import analisis
from app.monitoring.banda import serie_con_banda
from app.monitoring.mape_k import Parametros, ejecutar_ciclo
from app.monitoring.simulador import MIN_HISTORIA_REAL, generar_pico, muestras_pico
from app.repositories import monitoreo as repo

bp = Blueprint("monitoreo", __name__, url_prefix="/monitoreo")
METRICAS = ("LATENCIA_MS", "TASA_ERROR", "RPS", "CPU_PCT", "MEM_PCT")
PASOS = ("10s", "30s", "1min")


@bp.get("/servicios")
@requiere_rol("ADMIN")
def servicios():
    with engine().connect() as conn:
        return jsonify(filas_dict(repo.salud_servicios(conn)))


@bp.get("/metricas")
@requiere_rol("ADMIN")
def metricas():
    codigo = request.args.get("servicio", "api")
    metrica = request.args.get("metrica", "LATENCIA_MS").upper()
    if metrica not in METRICAS:
        raise ApiError("DATOS_INVALIDOS", f"metrica debe ser una de: {', '.join(METRICAS)}.", 400)
    paso = request.args.get("paso", "1min")
    if paso not in PASOS:
        raise ApiError("DATOS_INVALIDOS", f"paso debe ser uno de: {', '.join(PASOS)}.", 400)
    minutos = param_num("min", int, defecto=current_app.config["MONITOR_VENTANA_MIN"], minimo=1, maximo=1440)
    with engine().connect() as conn:
        servicio = repo.servicio_por_codigo(conn, codigo)
        if not servicio:
            raise ApiError("NO_ENCONTRADO", f"El servicio '{codigo}' no existe.", 404)
        filas = repo.serie(conn, servicio.id, metrica, minutos)
    return jsonify({"servicio": codigo, "metrica": metrica, "ventana_min": minutos, "paso": paso}
                   | serie_con_banda([(f.registrado_en, f.valor) for f in filas], paso))


@bp.get("/anomalias")
@requiere_rol("ADMIN")
def anomalias():
    limite = param_num("limite", int, defecto=50, minimo=1, maximo=500)
    estado = request.args.get("estado")
    with engine().connect() as conn:
        return jsonify(filas_dict(repo.anomalias(conn, estado, limite)))


@bp.get("/acciones")
@requiere_rol("ADMIN")
def acciones():
    limite = param_num("limite", int, defecto=50, minimo=1, maximo=500)
    with engine().connect() as conn:
        return jsonify(filas_dict(repo.acciones(conn, limite)))


@bp.get("/estado")
@requiere_rol("ADMIN")
def estado():
    """Parámetros del detector, latido del worker, proveedor de IA efectivo y la última línea base (Knowledge)."""
    p = Parametros.desde_config(current_app.config)
    ia = current_app.extensions["fitia_ia"]
    with engine().connect() as conn:
        ultimo = repo.ultimo_ciclo(conn)
        forzada = repo.ia_forzada_a_mock(conn)
        bases = filas_dict(repo.lineas_base_ultimas(conn))
    activo = bool(ultimo and datetime.now() - ultimo <= timedelta(seconds=2 * p.intervalo_seg + 10))
    configurado = current_app.config["AI_PROVIDER"]
    efectivo = "mock" if configurado != "gemini" or forzada or not ia.breaker.permite() else "gemini"
    return jsonify({"intervalo_seg": p.intervalo_seg, "ventana_min": p.ventana_min, "umbral_z": p.umbral_z,
                    "umbral_error": p.umbral_error, "enfriamiento_seg": p.enfriamiento_seg,
                    "worker": {"ultimo_ciclo": a_json(ultimo), "activo": activo},
                    "ia": {"configurado": configurado, "efectivo": efectivo, "forzada_por_monitor": forzada,
                           "circuit_breaker": ia.breaker.estado},
                    "lineas_base": bases})


@bp.post("/simular-pico")
@requiere_rol("ADMIN")
def simular_pico():
    """Inyecta el pico y corre el ciclo MAPE-K en el acto (solo ese servicio y métrica), para la demo.
    La verificación (MITIGADA) la hace el worker en su ciclo siguiente."""
    datos = cuerpo(SimularPico)
    p = Parametros.desde_config(current_app.config)
    ahora = datetime.now()
    with engine().begin() as conn:
        servicio = repo.servicio_por_codigo(conn, datos.servicio)
        if not servicio:
            raise ApiError("NO_ENCONTRADO", f"El servicio '{datos.servicio}' no existe.", 404)
        inicio_actual = ahora - timedelta(seconds=p.intervalo_seg)
        historia = repo.muestras(conn, servicio.id, datos.metrica, ahora - timedelta(minutes=p.ventana_min), ahora)
        anteriores = [(t, v) for t, v in historia if t <= inicio_actual]
        base_real = analisis.linea_base(anteriores, datos.metrica) if len(anteriores) >= MIN_HISTORIA_REAL else None
        reales = sum(1 for t, _ in historia if t > inicio_actual)
        filas = generar_pico(servicio.id, datos.metrica, datos.minutos, datos.factor,
                             n_pico=muestras_pico(p.intervalo_seg, reales), base_real=base_real, ahora=ahora,
                             intervalo_seg=p.intervalo_seg)
        repo.insertar_metricas(conn, filas)
    with engine().begin() as conn:
        ciclo = ejecutar_ciclo(conn, p, ahora=ahora, servicios=[datos.servicio], metricas=(datos.metrica,),
                               con_monitor=False)
    return jsonify({"servicio": datos.servicio, "metrica": datos.metrica, "muestras_insertadas": len(filas),
                    "sobre_base_real": base_real is not None, "ciclo": ciclo,
                    "mensaje": "Pico sintético registrado y analizado por el ciclo MAPE-K."}), 201
