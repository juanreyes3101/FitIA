from sqlalchemy import func, select, update

from app.db import tabla


def elegir(conn, ubicacion: str):
    """Rotación simple: el anuncio activo con menos impresiones en esa ubicación."""
    a = tabla("anuncios")
    return conn.execute(select(a).where(a.c.activo.is_(True), a.c.ubicacion == ubicacion)
                        .order_by(a.c.impresiones, func.rand()).limit(1)).first()


def sumar_impresion(conn, anuncio_id: int) -> None:
    a = tabla("anuncios")
    conn.execute(update(a).where(a.c.id == anuncio_id).values(impresiones=a.c.impresiones + 1))
