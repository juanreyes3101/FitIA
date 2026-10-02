from flask import Blueprint, jsonify

from app.middleware.auth_jwt import requiere_rol, usuario_actual_id
from app.middleware.rate_limit import limitar
from app.services import rutinas as servicio

bp = Blueprint("rutinas", __name__, url_prefix="/rutinas")


@bp.post("/generar")
@requiere_rol("USUARIO")
@limitar("generar", maximo=3, por_usuario=True)
def generar():
    datos, status = servicio.generar(usuario_actual_id())
    return jsonify(datos), status


@bp.get("/activa")
@requiere_rol()
def activa():
    return jsonify(servicio.activa(usuario_actual_id()))
