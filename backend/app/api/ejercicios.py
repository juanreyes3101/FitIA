from flask import Blueprint, jsonify, request

from app.api.esquemas import param_bool
from app.db import engine, filas_dict
from app.errors import ApiError
from app.middleware.auth_jwt import requiere_rol, usuario_actual_id
from app.repositories import ejercicios as repo

bp = Blueprint("ejercicios", __name__, url_prefix="/ejercicios")
TIPOS = ("FUERZA", "CARDIO", "ESTIRAMIENTO", "MOVILIDAD", "CORE")


@bp.get("")
@requiere_rol()
def listar():
    tipo = (request.args.get("tipo") or "").upper() or None
    if tipo and tipo not in TIPOS:
        raise ApiError("DATOS_INVALIDOS", f"tipo debe ser uno de: {', '.join(TIPOS)}.", 400)
    with engine().connect() as conn:
        return jsonify(filas_dict(repo.listar(conn, tipo, param_bool("lumbar"))))


@bp.get("/seguros")
@requiere_rol()
def seguros():
    with engine().connect() as conn:
        return jsonify(filas_dict(repo.seguros(conn, usuario_actual_id())))
