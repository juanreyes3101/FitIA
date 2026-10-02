"""Fase Monitor de MAPE-K (patrón Observer): cada petición deja su latencia y si fue error.
Se acumula en memoria y se escribe en lote en `metricas` cada 10 s."""
import logging
import threading
import time
from datetime import datetime

from flask import Flask, g, request
from sqlalchemy import insert, select

log = logging.getLogger(__name__)


class BufferMetricas:
    def __init__(self):
        self._filas: list[dict] = []
        self._lock = threading.Lock()

    def agregar(self, servicio: str, metrica: str, valor: float) -> None:
        with self._lock:
            self._filas.append({"servicio": servicio, "metrica": metrica, "valor": valor,
                                "registrado_en": datetime.now()})

    def vaciar(self) -> list[dict]:
        with self._lock:
            filas, self._filas = self._filas, []
        return filas


def servicio_de_ruta(ruta: str) -> str:
    return "ia" if ruta.endswith("/rutinas/generar") else "api"


def flush(app: Flask) -> int:
    buffer: BufferMetricas = app.extensions["fitia_metricas"]
    filas = buffer.vaciar()
    if not filas:
        return 0
    md = app.extensions["fitia_metadata"]
    servicios, metricas = md.tables["servicios"], md.tables["metricas"]
    try:
        with app.extensions["fitia_engine"].begin() as conn:
            ids = dict(conn.execute(select(servicios.c.codigo, servicios.c.id)).all())
            datos = [{"servicio_id": ids[f["servicio"]], "metrica": f["metrica"],
                      "valor": round(f["valor"], 4), "registrado_en": f["registrado_en"]}
                     for f in filas if f["servicio"] in ids]
            if datos:
                conn.execute(insert(metricas), datos)
        return len(datos)
    except Exception:
        log.exception("No se pudieron guardar las métricas")
        return 0


def registrar(app: Flask) -> None:
    @app.before_request
    def _inicio():
        g._t0 = time.perf_counter()

    @app.after_request
    def _fin(resp):
        t0 = getattr(g, "_t0", None)
        if t0 is not None and request.path.startswith("/api/v1") and not request.path.endswith("/health"):
            servicio = servicio_de_ruta(request.path)
            buffer: BufferMetricas = app.extensions["fitia_metricas"]
            buffer.agregar(servicio, "LATENCIA_MS", (time.perf_counter() - t0) * 1000)
            buffer.agregar(servicio, "TASA_ERROR", 1.0 if resp.status_code >= 500 else 0.0)
        return resp
