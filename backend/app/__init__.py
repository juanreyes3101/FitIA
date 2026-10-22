"""Fábrica de la API FitIA (una sola API REST para web, móvil y escritorio)."""
import logging

from flask import Flask

from app.config import Config
from app.db import crear_engine, reflejar_metadata
from app.errors import registrar_handlers
from app.extensions import cors, jwt
from app.middleware import metricas
from app.middleware.rate_limit import LimitadorMemoria

API_PREFIX = "/api/v1"


def create_app(config: Config | None = None) -> Flask:
    config = config or Config()
    config.validar()

    app = Flask(__name__)
    if config.PROXY_SALTOS > 0:
        # Detrás de Nginx: request.remote_addr pasa a ser la IP real del cliente (rate-limit por IP)
        from werkzeug.middleware.proxy_fix import ProxyFix
        app.wsgi_app = ProxyFix(app.wsgi_app, x_for=config.PROXY_SALTOS, x_proto=config.PROXY_SALTOS)
    app.config.from_object(config)
    app.config["DATABASE_URL"] = config.DATABASE_URL
    app.json.ensure_ascii = False
    app.json.sort_keys = False
    logging.basicConfig(level=logging.INFO)

    engine = crear_engine(config.DATABASE_URL)
    app.extensions["fitia_engine"] = engine
    app.extensions["fitia_metadata"] = reflejar_metadata(engine)
    app.extensions["fitia_limitador"] = LimitadorMemoria()
    app.extensions["fitia_metricas"] = metricas.BufferMetricas()

    from app.services.rutinas import ServicioIA
    app.extensions["fitia_ia"] = ServicioIA(app.config)

    jwt.init_app(app)
    from app.middleware import auth_jwt  # noqa: F401  (registra los loaders de errores JWT)
    cors.init_app(app, resources={rf"{API_PREFIX}/*": {"origins": config.CORS_ORIGINS or []}})
    registrar_handlers(app)
    metricas.registrar(app)
    _registrar_blueprints(app)

    if config.SCHEDULER_ACTIVO:
        _iniciar_scheduler(app)
    return app


def _registrar_blueprints(app: Flask) -> None:
    from app.api import (anuncios, auth, ejercicios, entrenador, imc, monitoreo, pagos, perfil, reportes,
                         rutinas, salud, sesiones)
    from app.api.admin import bp as admin_bp
    for modulo in (salud, auth, imc, perfil, ejercicios, rutinas, sesiones, pagos, anuncios, entrenador,
                   reportes, monitoreo):
        app.register_blueprint(modulo.bp, url_prefix=API_PREFIX + (modulo.bp.url_prefix or ""))
    app.register_blueprint(admin_bp, url_prefix=API_PREFIX + admin_bp.url_prefix)


def _iniciar_scheduler(app: Flask) -> None:
    """Flush en lote de métricas cada 10 s. Con el recargador de `flask --debug` solo se arranca en el
    proceso hijo para no duplicar el job."""
    import os

    if app.debug and os.environ.get("WERKZEUG_RUN_MAIN") != "true":
        return
    from apscheduler.schedulers.background import BackgroundScheduler
    scheduler = BackgroundScheduler(daemon=True)
    scheduler.add_job(metricas.flush, "interval", seconds=app.config["METRICAS_FLUSH_SEG"], args=[app],
                      id="flush_metricas", max_instances=1, coalesce=True)
    scheduler.start()
    app.extensions["fitia_scheduler"] = scheduler
