"""Acceso a MySQL con SQLAlchemy Core + PyMySQL. El esquema se REFLEJA desde la BD
(schema.sql es la fuente de verdad), no se redeclara aquí."""
from collections.abc import Sequence
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from flask import current_app
from sqlalchemy import Engine, MetaData, Table, create_engine


def crear_engine(url: str) -> Engine:
    return create_engine(url, pool_pre_ping=True, pool_recycle=3600, pool_size=5, max_overflow=10)


def reflejar_metadata(engine: Engine) -> MetaData:
    md = MetaData()
    md.reflect(bind=engine, views=True)
    return md


def engine() -> Engine:
    return current_app.extensions["fitia_engine"]


def tabla(nombre: str) -> Table:
    return current_app.extensions["fitia_metadata"].tables[nombre]


def call_proc_con_out(conn, nombre: str, params_in: Sequence[Any], nombres_out: Sequence[str]) -> dict:
    """Ejecuta CALL nombre(%s..., @out1, ...) sobre el cursor crudo de PyMySQL y
    devuelve {out: valor}. Todo en la misma conexión para que las variables @ existan."""
    raw = conn.connection.driver_connection
    marcadores = ", ".join(["%s"] * len(params_in) + [f"@{n}" for n in nombres_out])
    with raw.cursor() as cur:
        cur.execute(f"CALL {nombre}({marcadores})", tuple(params_in))
        while cur.nextset():
            pass
        cur.execute("SELECT " + ", ".join(f"@{n}" for n in nombres_out))
        fila = cur.fetchone()
    return dict(zip(nombres_out, fila))


def a_json(valor: Any) -> Any:
    if isinstance(valor, Decimal):
        return float(valor)
    if isinstance(valor, (datetime, date)):
        return valor.isoformat()
    return valor


def fila_dict(fila) -> dict:
    return {k: a_json(v) for k, v in fila._mapping.items()}


def filas_dict(filas) -> list[dict]:
    return [fila_dict(f) for f in filas]
