"""Autenticación JWT y control de acceso por rol."""
from functools import wraps

from flask_jwt_extended import get_jwt, get_jwt_identity, verify_jwt_in_request
from sqlalchemy import select

from app.db import engine, tabla
from app.errors import ApiError, respuesta_error
from app.extensions import jwt

ROLES = ("USUARIO", "ENTRENADOR", "ADMIN")


def requiere_rol(*roles: str):
    """@requiere_rol() = cualquier usuario autenticado; @requiere_rol("ADMIN") = solo admin."""
    def decorador(fn):
        @wraps(fn)
        def envoltura(*args, **kwargs):
            verify_jwt_in_request()
            if roles and get_jwt().get("rol") not in roles:
                raise ApiError("PROHIBIDO", "Tu rol no tiene acceso a esta acción.", 403)
            usuarios = tabla("usuarios")
            with engine().connect() as conn:
                estado = conn.execute(select(usuarios.c.estado)
                                      .where(usuarios.c.id == usuario_actual_id())).scalar()
            if estado != "ACTIVO":
                raise ApiError("PROHIBIDO", "Tu cuenta no está activa.", 403)
            return fn(*args, **kwargs)
        return envoltura
    return decorador


def usuario_actual_id() -> int:
    return int(get_jwt_identity())


def rol_actual() -> str:
    return get_jwt().get("rol", "")


@jwt.unauthorized_loader
def _sin_token(motivo):
    return respuesta_error("NO_AUTENTICADO", "Debes iniciar sesión para continuar.", 401)


@jwt.invalid_token_loader
def _token_invalido(motivo):
    return respuesta_error("NO_AUTENTICADO", "Tu sesión no es válida. Inicia sesión de nuevo.", 401)


@jwt.expired_token_loader
def _token_vencido(header, payload):
    return respuesta_error("SESION_EXPIRADA", "Tu sesión expiró. Inicia sesión de nuevo.", 401)


@jwt.revoked_token_loader
def _token_revocado(header, payload):
    return respuesta_error("NO_AUTENTICADO", "Tu sesión fue cerrada.", 401)


@jwt.needs_fresh_token_loader
def _token_no_fresco(header, payload):
    return respuesta_error("NO_AUTENTICADO", "Vuelve a iniciar sesión.", 401)


@jwt.user_lookup_error_loader
def _usuario_no_encontrado(header, payload):
    return respuesta_error("NO_AUTENTICADO", "Tu usuario ya no existe.", 401)
