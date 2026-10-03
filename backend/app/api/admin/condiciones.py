"""Catálogo de condiciones de salud (columnas de la matriz ejercicio × condición). Solo lectura."""
from flask import jsonify
from sqlalchemy import select

from app.db import engine, filas_dict, tabla
from app.middleware.auth_jwt import requiere_rol


def registrar(bp) -> None:
    @bp.get("/condiciones")
    @requiere_rol("ADMIN")
    def condiciones_listar():
        c = tabla("condiciones")
        with engine().connect() as conn:
            return jsonify(filas_dict(conn.execute(select(c).order_by(c.c.id)).all()))
