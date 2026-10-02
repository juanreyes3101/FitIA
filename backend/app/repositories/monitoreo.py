from datetime import datetime, timedelta

from sqlalchemy import insert, select, text

from app.db import tabla


def salud_servicios(conn):
    return conn.execute(text("SELECT * FROM v_salud_servicios ORDER BY codigo")).all()


def servicio_por_codigo(conn, codigo: str):
    s = tabla("servicios")
    return conn.execute(select(s).where(s.c.codigo == codigo)).first()


def serie(conn, servicio_id: int, metrica: str, minutos: int):
    m = tabla("metricas")
    desde = datetime.now() - timedelta(minutes=minutos)
    return conn.execute(select(m.c.registrado_en, m.c.valor)
                        .where(m.c.servicio_id == servicio_id, m.c.metrica == metrica, m.c.registrado_en >= desde)
                        .order_by(m.c.registrado_en)).all()


def insertar_metricas(conn, filas: list[dict]) -> None:
    if filas:
        conn.execute(insert(tabla("metricas")), filas)


def anomalias(conn, estado: str | None, limite: int):
    a, s = tabla("anomalias"), tabla("servicios")
    q = (select(a, s.c.codigo.label("servicio")).join(s, s.c.id == a.c.servicio_id)
         .order_by(a.c.detectada_en.desc()).limit(limite))
    if estado:
        q = q.where(a.c.estado == estado)
    return conn.execute(q).all()


def acciones(conn, limite: int):
    ac, a, s = tabla("acciones_remediacion"), tabla("anomalias"), tabla("servicios")
    return conn.execute(select(ac, s.c.codigo.label("servicio"))
                        .join(a, a.c.id == ac.c.anomalia_id).join(s, s.c.id == a.c.servicio_id)
                        .order_by(ac.c.ejecutada_en.desc()).limit(limite)).all()
