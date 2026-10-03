"""Worker de monitoreo autónomo (proceso aparte de la API):

    cd backend && .venv\\Scripts\\python -m app.monitoring.worker

Cada MONITOR_INTERVAL_SEG corre el ciclo MAPE-K completo. Ctrl+C para detenerlo.
"""
import logging

from apscheduler.schedulers.blocking import BlockingScheduler

from app import create_app
from app.config import Config
from app.monitoring.mape_k import Parametros, ejecutar_ciclo

log = logging.getLogger("fitia.worker")


class WorkerConfig(Config):
    SCHEDULER_ACTIVO = False  # el flush de métricas es cosa de la API


def ciclo(app) -> None:
    with app.app_context():
        p = Parametros.desde_config(app.config)
        try:
            with app.extensions["fitia_engine"].begin() as conn:
                r = ejecutar_ciclo(conn, p)
        except Exception:
            log.exception("Falló el ciclo MAPE-K")
            return
    log.info("Ciclo MAPE-K: %s muestras, %s líneas base, %s anomalías nuevas, %s acciones, %s mitigadas",
             r["muestras_monitor"], r["lineas_base"], len(r["anomalias"]), len(r["acciones"]), len(r["mitigadas"]))


def main() -> None:
    app = create_app(WorkerConfig())
    try:
        import psutil
        psutil.cpu_percent(interval=None)  # la primera lectura siempre es 0: se "ceba" aquí
    except ImportError:  # pragma: no cover
        pass
    intervalo = app.config["MONITOR_INTERVAL_SEG"]
    scheduler = BlockingScheduler()
    scheduler.add_job(ciclo, "interval", seconds=intervalo, args=[app], id="mape_k", max_instances=1,
                      coalesce=True)
    scheduler.add_job(ciclo, args=[app], id="mape_k_inicial")  # primera corrida inmediata
    log.info("Worker MAPE-K iniciado: un ciclo cada %s s (ventana %s min, umbral z > %s, enfriamiento %s s)",
             intervalo, app.config["MONITOR_VENTANA_MIN"], app.config["MONITOR_Z_UMBRAL"],
             app.config["MONITOR_ENFRIAMIENTO_SEG"])
    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        log.info("Worker detenido")


if __name__ == "__main__":
    main()
