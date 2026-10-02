from sqlalchemy import func, insert, select

from app.db import call_proc_con_out, tabla


def registrar(conn, usuario_id: int, proveedor: str, modelo: str, estado: str, rutina_id: int | None = None,
              latencia_ms: int | None = None, tokens_entrada: int | None = None,
              tokens_salida: int | None = None, detalle_error: str | None = None) -> int:
    return conn.execute(insert(tabla("solicitudes_ia")).values(
        usuario_id=usuario_id, rutina_id=rutina_id, proveedor=proveedor, modelo=modelo[:60], estado=estado,
        latencia_ms=latencia_ms, tokens_entrada=tokens_entrada, tokens_salida=tokens_salida,
        detalle_error=(detalle_error or None) and detalle_error[:500])).inserted_primary_key[0]


def cupo_restante(conn, usuario_id: int) -> int:
    return int(call_proc_con_out(conn, "sp_cupo_ia", [usuario_id], ["p_restantes"])["p_restantes"] or 0)


def total_hoy(conn) -> int:
    s = tabla("solicitudes_ia")
    return conn.execute(select(func.count()).select_from(s)
                        .where(s.c.creado_en >= func.current_date(), s.c.proveedor != "mock")).scalar_one()
