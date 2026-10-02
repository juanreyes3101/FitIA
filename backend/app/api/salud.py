from flask import Blueprint, current_app, jsonify
from sqlalchemy import text

from app.db import engine

bp = Blueprint("salud", __name__)


@bp.get("/health")
def health():
    try:
        with engine().connect() as conn:
            conn.execute(text("SELECT 1"))
        bd = "OK"
    except Exception:
        bd = "CAIDA"
    ia = current_app.extensions["fitia_ia"]
    cuerpo = {"estado": "OK" if bd == "OK" else "DEGRADADO", "bd": bd,
              "ia": {"proveedor": current_app.config["AI_PROVIDER"], "circuit_breaker": ia.breaker.estado}}
    return jsonify(cuerpo), 200 if bd == "OK" else 503
