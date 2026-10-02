from flask import Blueprint, jsonify

from app.api.esquemas import RevisionRutina, cuerpo
from app.middleware.auth_jwt import requiere_rol, rol_actual, usuario_actual_id
from app.services import entrenador as servicio

bp = Blueprint("entrenador", __name__, url_prefix="/entrenador")


@bp.get("/rutinas-pendientes")
@requiere_rol("ENTRENADOR", "ADMIN")
def pendientes():
    return jsonify(servicio.pendientes())


@bp.patch("/rutinas/<int:rutina_id>")
@requiere_rol("ENTRENADOR", "ADMIN")
def revisar(rutina_id: int):
    return jsonify(servicio.revisar(rutina_id, usuario_actual_id(), rol_actual(), cuerpo(RevisionRutina)))
