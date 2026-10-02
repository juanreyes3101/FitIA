from collections import defaultdict

from sqlalchemy import select, text

from app.db import tabla


def listar(conn, tipo: str | None = None, lumbar: bool | None = None):
    e, gm, eq = tabla("ejercicios"), tabla("grupos_musculares"), tabla("equipamiento")
    q = (select(e.c.id, e.c.nombre, e.c.tipo, gm.c.nombre.label("grupo"), eq.c.nombre.label("equipo"),
                e.c.dificultad, e.c.impacto, e.c.apto_lumbar, e.c.instrucciones, e.c.imagen_url, e.c.video_url)
         .join(gm, gm.c.id == e.c.grupo_muscular_id).join(eq, eq.c.id == e.c.equipamiento_id)
         .order_by(e.c.tipo, e.c.nombre))
    if tipo:
        q = q.where(e.c.tipo == tipo)
    if lumbar is not None:
        q = q.where(e.c.apto_lumbar.is_(lumbar))
    return conn.execute(q).all()


def obtener(conn, ejercicio_id: int):
    e = tabla("ejercicios")
    return conn.execute(select(e).where(e.c.id == ejercicio_id)).first()


def seguros(conn, usuario_id: int):
    """1.ª capa: catálogo permitido calculado por la BD."""
    return conn.execute(text("CALL sp_ejercicios_seguros(:uid)"), {"uid": usuario_id}).all()


def ids_existentes(conn) -> set[int]:
    return set(conn.execute(select(tabla("ejercicios").c.id)).scalars())


def contraindicaciones_por_ejercicio(conn) -> dict[int, set[str]]:
    ci, c = tabla("contraindicaciones"), tabla("condiciones")
    mapa: dict[int, set[str]] = defaultdict(set)
    for ejercicio_id, codigo in conn.execute(select(ci.c.ejercicio_id, c.c.codigo)
                                             .join(c, c.c.id == ci.c.condicion_id)):
        mapa[ejercicio_id].add(codigo)
    return dict(mapa)
