"""Consola de monitoreo (fase Monitor de MAPE-K + lecturas de la bitácora)."""
from flask import Blueprint, current_app, jsonify, request

from app.api.esquemas import SimularPico, cuerpo, param_num
from app.db import engine, filas_dict
from app.errors import ApiError
from app.middleware.auth_jwt import requiere_rol
from app.monitoring.banda import serie_con_banda
from app.monitoring.simulador import generar_pico
from app.repositories import monitoreo as repo

bp = Blueprint("monitoreo", __name__, url_prefix="/monitoreo")
METRICAS = ("LATENCIA_MS", "TASA_ERROR", "RPS", "CPU_PCT", "MEM_PCT")


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
    minutos = param_num("min", int, defecto=current_app.config["MONITOR_VENTANA_MIN"], minimo=1, maximo=1440)
    with engine().connect() as conn:
        servicio = repo.servicio_por_codigo(conn, codigo)
        if not servicio:
            raise ApiError("NO_ENCONTRADO", f"El servicio '{codigo}' no existe.", 404)
        filas = repo.serie(conn, servicio.id, metrica, minutos)
    return jsonify({"servicio": codigo, "metrica": metrica, "ventana_min": minutos}
                   | serie_con_banda([(f.registrado_en, f.valor) for f in filas]))


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


@bp.post("/simular-pico")
@requiere_rol("ADMIN")
def simular_pico():
    datos = cuerpo(SimularPico)
    with engine().begin() as conn:
        servicio = repo.servicio_por_codigo(conn, datos.servicio)
        if not servicio:
            raise ApiError("NO_ENCONTRADO", f"El servicio '{datos.servicio}' no existe.", 404)
        filas = generar_pico(servicio.id, datos.metrica, datos.minutos, datos.factor)
        repo.insertar_metricas(conn, filas)
    return jsonify({"servicio": datos.servicio, "metrica": datos.metrica, "muestras_insertadas": len(filas),
                    "mensaje": "Pico sintético registrado. Revisa la gráfica de métricas."}), 201
