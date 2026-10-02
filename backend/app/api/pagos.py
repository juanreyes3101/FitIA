from flask import Blueprint, jsonify

from app.api.esquemas import PagoEntrada, cuerpo
from app.db import engine, filas_dict
from app.middleware.auth_jwt import requiere_rol, usuario_actual_id
from app.repositories import planes as repo_planes
from app.services import pagos as servicio

bp = Blueprint("pagos", __name__)


@bp.get("/planes")
def planes():
    with engine().connect() as conn:
        return jsonify(filas_dict(repo_planes.activos(conn)))


@bp.post("/pagos/simular")
@requiere_rol()
def simular():
    # Un pago RECHAZADO es un resultado de negocio esperado: 200 con estado en el cuerpo
    return jsonify(servicio.simular(usuario_actual_id(), cuerpo(PagoEntrada)))
