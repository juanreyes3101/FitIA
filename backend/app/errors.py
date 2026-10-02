"""Formato de error único: {"error": {"codigo": "...", "mensaje": "..."}}."""
import logging

from flask import Flask, jsonify
from pydantic import ValidationError
from sqlalchemy.exc import DBAPIError
from werkzeug.exceptions import HTTPException

log = logging.getLogger(__name__)


class ApiError(Exception):
    def __init__(self, codigo: str, mensaje: str, status: int = 400):
        super().__init__(mensaje)
        self.codigo = codigo
        self.mensaje = mensaje
        self.status = status


def respuesta_error(codigo: str, mensaje: str, status: int):
    return jsonify({"error": {"codigo": codigo, "mensaje": mensaje}}), status


_HTTP = {
    400: ("DATOS_INVALIDOS", "La solicitud no es válida."),
    401: ("NO_AUTENTICADO", "Debes iniciar sesión."),
    403: ("PROHIBIDO", "No tienes permiso para esta acción."),
    404: ("NO_ENCONTRADO", "El recurso no existe."),
    405: ("METODO_NO_PERMITIDO", "Método no permitido en esta ruta."),
    415: ("DATOS_INVALIDOS", "Envía el cuerpo en formato JSON."),
}


def _mensaje_pydantic(exc: ValidationError) -> str:
    partes = []
    for e in exc.errors()[:5]:
        campo = ".".join(str(p) for p in e.get("loc", ())) or "cuerpo"
        partes.append(f"{campo}: {e.get('msg')}")
    return "Revisa los datos enviados. " + "; ".join(partes)


def es_error_trigger(exc: DBAPIError) -> bool:
    """El trigger trg_rutina_ejercicio_seguro lanza SQLSTATE 45000 (código MySQL 1644)."""
    orig = getattr(exc, "orig", None)
    return bool(orig and getattr(orig, "args", None) and orig.args[0] == 1644)


def registrar_handlers(app: Flask) -> None:
    @app.errorhandler(ApiError)
    def _api(exc: ApiError):
        return respuesta_error(exc.codigo, exc.mensaje, exc.status)

    @app.errorhandler(ValidationError)
    def _pydantic(exc: ValidationError):
        return respuesta_error("DATOS_INVALIDOS", _mensaje_pydantic(exc), 400)

    @app.errorhandler(DBAPIError)
    def _db(exc: DBAPIError):
        if es_error_trigger(exc):
            return respuesta_error("EJERCICIO_CONTRAINDICADO", str(exc.orig.args[1]), 422)
        log.exception("Error de base de datos")
        return respuesta_error("ERROR_BD", "No pudimos completar la operación en la base de datos.", 500)

    @app.errorhandler(HTTPException)
    def _http(exc: HTTPException):
        codigo, mensaje = _HTTP.get(exc.code, ("ERROR", exc.description or "Error"))
        return respuesta_error(codigo, mensaje, exc.code or 500)

    @app.errorhandler(Exception)
    def _generico(exc: Exception):
        log.exception("Error no controlado")
        return respuesta_error("ERROR_INTERNO", "Ocurrió un error inesperado. Intenta de nuevo.", 500)
