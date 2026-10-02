from flask import Blueprint, jsonify, request

from app.db import engine, fila_dict
from app.errors import ApiError
from app.middleware.auth_jwt import requiere_rol, usuario_actual_id
from app.repositories import anuncios as repo
from app.repositories.pagos import suscripcion_activa

bp = Blueprint("anuncios", __name__)
UBICACIONES = ("BANNER_HOME", "ENTRE_EJERCICIOS", "FIN_SESION")


@bp.get("/anuncios")
@requiere_rol()
def anuncio():
    ubicacion = (request.args.get("ubicacion") or "BANNER_HOME").upper()
    if ubicacion not in UBICACIONES:
        raise ApiError("DATOS_INVALIDOS", f"ubicacion debe ser una de: {', '.join(UBICACIONES)}.", 400)
    with engine().begin() as conn:
        sus = suscripcion_activa(conn, usuario_actual_id())
        if sus and not sus.con_publicidad:
            return jsonify({"anuncio": None, "motivo": "Tu plan Pro no tiene publicidad."})
        fila = repo.elegir(conn, ubicacion)
        if fila:
            repo.sumar_impresion(conn, fila.id)
    return jsonify({"anuncio": fila_dict(fila) if fila else None})
