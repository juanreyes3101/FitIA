from sqlalchemy import select

from app.db import tabla


def activos(conn):
    p = tabla("planes")
    return conn.execute(select(p).where(p.c.activo.is_(True)).order_by(p.c.precio_cop)).all()


def por_codigo(conn, codigo: str):
    p = tabla("planes")
    return conn.execute(select(p).where(p.c.codigo == codigo)).first()
