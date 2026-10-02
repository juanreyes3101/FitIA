import pandas as pd
from sqlalchemy import text


def _df(conn, sql: str) -> pd.DataFrame:
    res = conn.execute(text(sql))
    return pd.DataFrame(res.all(), columns=list(res.keys()))


def ingresos(conn) -> pd.DataFrame:
    return _df(conn, "SELECT mes, plan, pagos_aprobados, total_cop FROM v_ingresos_mensuales ORDER BY mes, plan")


def uso_ia(conn) -> pd.DataFrame:
    return _df(conn, "SELECT dia, proveedor, modelo, solicitudes, exitosas, rechazadas_por_seguridad, "
                     "latencia_promedio_ms, tokens_entrada, tokens_salida FROM v_uso_ia_diario ORDER BY dia")


def adherencia(conn) -> pd.DataFrame:
    return _df(conn, "SELECT usuario_id, semana_iso, sesiones, completadas, rpe_promedio, dolor_promedio "
                     "FROM v_adherencia_semanal ORDER BY semana_iso, usuario_id")
