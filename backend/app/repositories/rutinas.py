from sqlalchemy import func, insert, select, update

from app.ai.schema import RutinaIA
from app.db import fila_dict, tabla

VIGENTES = ("VALIDADA", "ACTIVA")


def crear_completa(conn, usuario_id: int, rutina: RutinaIA, objetivo: str, estado: str = "VALIDADA",
                   origen: str = "IA") -> int:
    """Inserta rutina → días → ejercicios. El trigger trg_rutina_ejercicio_seguro revisa cada fila."""
    rutina_id = conn.execute(insert(tabla("rutinas")).values(
        usuario_id=usuario_id, nombre=rutina.nombre[:100], objetivo=objetivo, origen=origen,
        estado=estado, semanas=rutina.semanas)).inserted_primary_key[0]
    for dia in rutina.dias:
        dia_id = conn.execute(insert(tabla("rutina_dias")).values(
            rutina_id=rutina_id, dia_numero=dia.dia_numero, enfoque=dia.enfoque[:60])).inserted_primary_key[0]
        for ej in dia.ejercicios:
            conn.execute(insert(tabla("rutina_ejercicios")).values(
                rutina_dia_id=dia_id, ejercicio_id=ej.ejercicio_id, orden=ej.orden, series=ej.series,
                repeticiones=ej.repeticiones, duracion_seg=ej.duracion_seg, descanso_seg=ej.descanso_seg,
                notas=(ej.notas or None) and ej.notas[:255]))
    return rutina_id


def obtener(conn, rutina_id: int):
    r = tabla("rutinas")
    return conn.execute(select(r).where(r.c.id == rutina_id)).first()


def detalle(conn, rutina_id: int) -> dict | None:
    fila = obtener(conn, rutina_id)
    if not fila:
        return None
    rd, re, e = tabla("rutina_dias"), tabla("rutina_ejercicios"), tabla("ejercicios")
    filas = conn.execute(
        select(rd.c.id.label("rutina_dia_id"), rd.c.dia_numero, rd.c.enfoque,
               re.c.id.label("rutina_ejercicio_id"), re.c.ejercicio_id, re.c.orden, re.c.series,
               re.c.repeticiones, re.c.duracion_seg, re.c.descanso_seg, re.c.notas,
               e.c.nombre, e.c.tipo, e.c.dificultad, e.c.impacto, e.c.apto_lumbar, e.c.instrucciones)
        .select_from(rd.outerjoin(re, re.c.rutina_dia_id == rd.c.id).outerjoin(e, e.c.id == re.c.ejercicio_id))
        .where(rd.c.rutina_id == rutina_id).order_by(rd.c.dia_numero, re.c.orden)).all()
    dias: dict[int, dict] = {}
    for f in filas:
        d = dias.setdefault(f.rutina_dia_id, {"rutina_dia_id": f.rutina_dia_id, "dia_numero": f.dia_numero,
                                              "enfoque": f.enfoque, "ejercicios": []})
        if f.rutina_ejercicio_id:
            d["ejercicios"].append({
                "rutina_ejercicio_id": f.rutina_ejercicio_id, "ejercicio_id": f.ejercicio_id, "nombre": f.nombre,
                "tipo": f.tipo, "dificultad": f.dificultad, "impacto": f.impacto,
                "apto_lumbar": bool(f.apto_lumbar), "orden": f.orden, "series": f.series,
                "repeticiones": f.repeticiones, "duracion_seg": f.duracion_seg,
                "descanso_seg": f.descanso_seg, "notas": f.notas, "instrucciones": f.instrucciones})
    return fila_dict(fila) | {"dias": list(dias.values())}


def vigente(conn, usuario_id: int):
    """Rutina activa del usuario: la más reciente en VALIDADA o ACTIVA."""
    r = tabla("rutinas")
    return conn.execute(select(r.c.id).where(r.c.usuario_id == usuario_id, r.c.estado.in_(VIGENTES))
                        .order_by(r.c.creada_en.desc(), r.c.id.desc()).limit(1)).scalar()


def pendientes(conn):
    r, u = tabla("rutinas"), tabla("usuarios")
    return conn.execute(
        select(r.c.id, r.c.nombre, r.c.objetivo, r.c.origen, r.c.estado, r.c.semanas, r.c.creada_en,
               r.c.usuario_id, func.concat(u.c.nombres, " ", u.c.apellidos).label("usuario"))
        .join(u, u.c.id == r.c.usuario_id).where(r.c.estado == "VALIDADA").order_by(r.c.creada_en)).all()


def cambiar_estado(conn, rutina_id: int, estado: str, revisor_id: int | None = None,
                   observaciones: str | None = None) -> None:
    r = tabla("rutinas")
    valores = {"estado": estado}
    if revisor_id is not None:
        valores["entrenador_revisor_id"] = revisor_id
    if observaciones is not None:
        valores["observaciones_validacion"] = observaciones[:500]
    conn.execute(update(r).where(r.c.id == rutina_id).values(**valores))


def archivar_activas(conn, usuario_id: int, excepto_id: int) -> None:
    r = tabla("rutinas")
    conn.execute(update(r).where(r.c.usuario_id == usuario_id, r.c.estado == "ACTIVA", r.c.id != excepto_id)
                 .values(estado="ARCHIVADA"))


def ejercicio_de_rutina(conn, rutina_ejercicio_id: int):
    re, rd = tabla("rutina_ejercicios"), tabla("rutina_dias")
    return conn.execute(select(re, rd.c.rutina_id).join(rd, rd.c.id == re.c.rutina_dia_id)
                        .where(re.c.id == rutina_ejercicio_id)).first()


def ajustar_ejercicio(conn, rutina_ejercicio_id: int, cambios: dict) -> None:
    """Solo volumen: nunca se cambia ejercicio_id por UPDATE (el trigger de seguridad es BEFORE INSERT)."""
    re = tabla("rutina_ejercicios")
    conn.execute(update(re).where(re.c.id == rutina_ejercicio_id).values(**cambios))


def dia_del_usuario(conn, rutina_dia_id: int, usuario_id: int) -> bool:
    rd, r = tabla("rutina_dias"), tabla("rutinas")
    return conn.execute(select(rd.c.id).join(r, r.c.id == rd.c.rutina_id)
                        .where(rd.c.id == rutina_dia_id, r.c.usuario_id == usuario_id)).first() is not None
