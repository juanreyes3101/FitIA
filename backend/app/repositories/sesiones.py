from sqlalchemy import insert, select, text

from app.db import tabla


def crear(conn, usuario_id: int, datos: dict, ejercicios: list[dict]) -> int:
    sesion_id = conn.execute(insert(tabla("sesiones_entrenamiento"))
                             .values(usuario_id=usuario_id, **datos)).inserted_primary_key[0]
    if ejercicios:
        conn.execute(insert(tabla("sesion_ejercicios")), [{"sesion_id": sesion_id, **e} for e in ejercicios])
    return sesion_id


def obtener(conn, sesion_id: int):
    s = tabla("sesiones_entrenamiento")
    return conn.execute(select(s).where(s.c.id == sesion_id)).first()


def progreso_corporal(conn, usuario_id: int, dias: int):
    return conn.execute(text(
        "SELECT fecha, peso_kg, imc, clasificacion FROM v_progreso_corporal "
        "WHERE usuario_id = :uid AND fecha >= CURRENT_DATE - INTERVAL :dias DAY ORDER BY fecha"),
        {"uid": usuario_id, "dias": dias}).all()


def adherencia(conn, usuario_id: int, dias: int):
    semana_desde = conn.execute(text("SELECT YEARWEEK(CURRENT_DATE - INTERVAL :dias DAY, 3)"),
                                {"dias": dias}).scalar()
    return conn.execute(text(
        "SELECT semana_iso, sesiones, completadas, rpe_promedio, dolor_promedio FROM v_adherencia_semanal "
        "WHERE usuario_id = :uid AND semana_iso >= :desde ORDER BY semana_iso"),
        {"uid": usuario_id, "desde": semana_desde}).all()
