"""Reglas de seguridad (ejercicio × condición). Llave compuesta."""
from flask import jsonify
from sqlalchemy import delete, insert, select, update
from sqlalchemy.exc import IntegrityError

from app.api.esquemas import ContraindicacionAdmin, cuerpo
from app.db import engine, fila_dict, filas_dict, tabla
from app.errors import ApiError
from app.middleware.auth_jwt import requiere_rol


def registrar(bp) -> None:
    @bp.get("/contraindicaciones")
    @requiere_rol("ADMIN")
    def contraindicaciones_listar():
        ci, e, c = tabla("contraindicaciones"), tabla("ejercicios"), tabla("condiciones")
        with engine().connect() as conn:
            return jsonify(filas_dict(conn.execute(
                select(ci, e.c.nombre.label("ejercicio"), c.c.codigo.label("condicion"))
                .join(e, e.c.id == ci.c.ejercicio_id).join(c, c.c.id == ci.c.condicion_id)
                .order_by(ci.c.ejercicio_id, ci.c.condicion_id)).all()))

    @bp.post("/contraindicaciones")
    @requiere_rol("ADMIN")
    def contraindicaciones_crear():
        datos = cuerpo(ContraindicacionAdmin)
        try:
            with engine().begin() as conn:
                conn.execute(insert(tabla("contraindicaciones")).values(**datos.model_dump()))
        except IntegrityError as exc:
            raise ApiError("CONFLICTO", "Esa contraindicación ya existe o el ejercicio/condición no existe.",
                           409) from exc
        return jsonify(datos.model_dump()), 201

    @bp.put("/contraindicaciones/<int:ejercicio_id>/<int:condicion_id>")
    @requiere_rol("ADMIN")
    def contraindicaciones_editar(ejercicio_id: int, condicion_id: int):
        datos = cuerpo(ContraindicacionAdmin)
        ci = tabla("contraindicaciones")
        with engine().begin() as conn:
            res = conn.execute(update(ci).where(ci.c.ejercicio_id == ejercicio_id, ci.c.condicion_id == condicion_id)
                               .values(motivo=datos.motivo))
            if res.rowcount == 0 and not conn.execute(select(ci.c.ejercicio_id).where(
                    ci.c.ejercicio_id == ejercicio_id, ci.c.condicion_id == condicion_id)).first():
                raise ApiError("NO_ENCONTRADO", "Esa contraindicación no existe.", 404)
            fila = conn.execute(select(ci).where(ci.c.ejercicio_id == ejercicio_id,
                                                 ci.c.condicion_id == condicion_id)).first()
        return jsonify(fila_dict(fila))

    @bp.delete("/contraindicaciones/<int:ejercicio_id>/<int:condicion_id>")
    @requiere_rol("ADMIN")
    def contraindicaciones_borrar(ejercicio_id: int, condicion_id: int):
        ci = tabla("contraindicaciones")
        with engine().begin() as conn:
            res = conn.execute(delete(ci).where(ci.c.ejercicio_id == ejercicio_id, ci.c.condicion_id == condicion_id))
        if res.rowcount == 0:
            raise ApiError("NO_ENCONTRADO", "Esa contraindicación no existe.", 404)
        return jsonify({"ok": True})
