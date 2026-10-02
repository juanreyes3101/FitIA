from flask import Blueprint, jsonify

from app.api.esquemas import MedicionEntrada, PerfilEntrada, cuerpo
from app.middleware.auth_jwt import requiere_rol, usuario_actual_id
from app.services import perfil as servicio

bp = Blueprint("perfil", __name__, url_prefix="/perfil")


@bp.get("")
@requiere_rol()
def obtener():
    return jsonify(servicio.obtener(usuario_actual_id()))


@bp.put("")
@requiere_rol()
def actualizar():
    return jsonify(servicio.actualizar(usuario_actual_id(), cuerpo(PerfilEntrada)))


@bp.post("/mediciones")
@requiere_rol()
def medicion():
    return jsonify(servicio.registrar_medicion(usuario_actual_id(), cuerpo(MedicionEntrada))), 201
