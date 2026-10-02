from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required

from app.api.esquemas import Login, Registro, cuerpo
from app.middleware.auth_jwt import usuario_actual_id
from app.middleware.rate_limit import limitar
from app.services import auth as servicio

bp = Blueprint("auth", __name__, url_prefix="/auth")


@bp.post("/registro")
@limitar("registro", maximo=5)
def registro():
    return jsonify(servicio.registrar(cuerpo(Registro))), 201


@bp.post("/login")
@limitar("login", maximo=5)
def login():
    datos = cuerpo(Login)
    return jsonify(servicio.login(datos.email, datos.password))


@bp.post("/refresh")
@jwt_required(refresh=True)
def refresh():
    return jsonify(servicio.refrescar(usuario_actual_id()))
