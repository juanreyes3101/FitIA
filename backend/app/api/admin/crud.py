"""CRUD genérico para catálogos simples con llave `id` (ejercicios, planes, anuncios)."""
from flask import Blueprint, jsonify
from pydantic import BaseModel
from sqlalchemy import delete, insert, select, update
from sqlalchemy.exc import IntegrityError

from app.api.esquemas import cuerpo
from app.db import engine, fila_dict, filas_dict, tabla
from app.errors import ApiError
from app.middleware.auth_jwt import requiere_rol


def registrar_crud(bp: Blueprint, nombre_tabla: str, modelo: type[BaseModel], etiqueta: str,
                   borrado_logico: bool) -> None:
    ruta = f"/{nombre_tabla}"

    def _obtener(conn, item_id):
        t = tabla(nombre_tabla)
        fila = conn.execute(select(t).where(t.c.id == item_id)).first()
        if not fila:
            raise ApiError("NO_ENCONTRADO", f"No existe ese {etiqueta}.", 404)
        return fila

    @bp.get(ruta, endpoint=f"{nombre_tabla}_listar")
    @requiere_rol("ADMIN")
    def listar():
        t = tabla(nombre_tabla)
        with engine().connect() as conn:
            return jsonify(filas_dict(conn.execute(select(t).order_by(t.c.id)).all()))

    @bp.get(f"{ruta}/<int:item_id>", endpoint=f"{nombre_tabla}_obtener")
    @requiere_rol("ADMIN")
    def obtener(item_id: int):
        with engine().connect() as conn:
            return jsonify(fila_dict(_obtener(conn, item_id)))

    @bp.post(ruta, endpoint=f"{nombre_tabla}_crear")
    @requiere_rol("ADMIN")
    def crear():
        datos = cuerpo(modelo).model_dump()
        try:
            with engine().begin() as conn:
                nuevo_id = conn.execute(insert(tabla(nombre_tabla)).values(**datos)).inserted_primary_key[0]
                return jsonify(fila_dict(_obtener(conn, nuevo_id))), 201
        except IntegrityError as exc:
            raise ApiError("CONFLICTO", f"No se pudo crear el {etiqueta}: ya existe o tiene referencias inválidas.",
                           409) from exc

    @bp.put(f"{ruta}/<int:item_id>", endpoint=f"{nombre_tabla}_editar")
    @requiere_rol("ADMIN")
    def editar(item_id: int):
        datos = cuerpo(modelo).model_dump()
        t = tabla(nombre_tabla)
        try:
            with engine().begin() as conn:
                _obtener(conn, item_id)
                conn.execute(update(t).where(t.c.id == item_id).values(**datos))
                return jsonify(fila_dict(_obtener(conn, item_id)))
        except IntegrityError as exc:
            raise ApiError("CONFLICTO", f"No se pudo editar el {etiqueta}: dato duplicado o referencia inválida.",
                           409) from exc

    @bp.delete(f"{ruta}/<int:item_id>", endpoint=f"{nombre_tabla}_borrar")
    @requiere_rol("ADMIN")
    def borrar(item_id: int):
        t = tabla(nombre_tabla)
        try:
            with engine().begin() as conn:
                _obtener(conn, item_id)
                if borrado_logico:
                    conn.execute(update(t).where(t.c.id == item_id).values(activo=False))
                else:
                    conn.execute(delete(t).where(t.c.id == item_id))
        except IntegrityError as exc:
            raise ApiError("EN_USO", f"No puedes borrar este {etiqueta}: está en uso.", 409) from exc
        return jsonify({"ok": True, "id": item_id, "borrado_logico": borrado_logico})
