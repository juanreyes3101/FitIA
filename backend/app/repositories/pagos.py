from sqlalchemy import select

from app.db import call_proc_con_out, tabla


def simular(conn, usuario_id: int, plan_codigo: str, metodo: str, ultimos4: str | None) -> dict:
    """sp_simular_pago maneja su propia transacción (COMMIT/ROLLBACK internos)."""
    return call_proc_con_out(conn, "sp_simular_pago", [usuario_id, plan_codigo, metodo, ultimos4],
                             ["p_pago_id", "p_estado"])


def obtener(conn, pago_id: int):
    p = tabla("pagos")
    return conn.execute(select(p).where(p.c.id == pago_id)).first()


def suscripcion_activa(conn, usuario_id: int):
    s, pl = tabla("suscripciones"), tabla("planes")
    return conn.execute(select(s.c.id, s.c.fecha_inicio, s.c.fecha_fin, s.c.estado, pl.c.codigo, pl.c.nombre,
                               pl.c.con_publicidad, pl.c.rutinas_ia_mes)
                        .join(pl, pl.c.id == s.c.plan_id)
                        .where(s.c.usuario_id == usuario_id, s.c.estado == "ACTIVA")
                        .order_by(s.c.id.desc()).limit(1)).first()
