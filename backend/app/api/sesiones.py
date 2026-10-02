from flask import Blueprint, jsonify

from app.api.esquemas import SesionEntrada, cuerpo, param_num
from app.middleware.auth_jwt import requiere_rol, usuario_actual_id
from app.services import sesiones as servicio

bp = Blueprint("sesiones", __name__)


@bp.post("/sesiones")
@requiere_rol()
def registrar():
    return jsonify(servicio.registrar(usuario_actual_id(), cuerpo(SesionEntrada))), 201


@bp.get("/progreso")
@requiere_rol()
def progreso():
    dias = param_num("dias", int, defecto=90, minimo=1, maximo=730)
    return jsonify(servicio.progreso(usuario_actual_id(), dias))
