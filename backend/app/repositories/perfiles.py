from sqlalchemy import and_, delete, insert, select, update

from app.db import tabla


def resumen(conn, usuario_id: int):
    v = tabla("v_usuario_resumen")
    return conn.execute(select(v).where(v.c.usuario_id == usuario_id)).first()


def obtener_perfil(conn, usuario_id: int):
    p = tabla("perfiles_salud")
    return conn.execute(select(p).where(p.c.usuario_id == usuario_id)).first()


def guardar_perfil(conn, usuario_id: int, datos: dict) -> None:
    p = tabla("perfiles_salud")
    if obtener_perfil(conn, usuario_id):
        conn.execute(update(p).where(p.c.usuario_id == usuario_id).values(**datos))
    else:
        conn.execute(insert(p).values(usuario_id=usuario_id, **datos))


def condiciones_activas(conn, usuario_id: int):
    uc, c = tabla("usuario_condiciones"), tabla("condiciones")
    return conn.execute(
        select(c.c.id, c.c.codigo, c.c.nombre, c.c.origen, uc.c.severidad, uc.c.desde)
        .join(c, c.c.id == uc.c.condicion_id)
        .where(uc.c.usuario_id == usuario_id, uc.c.activa.is_(True)).order_by(c.c.id)).all()


def catalogo_condiciones(conn):
    return conn.execute(select(tabla("condiciones"))).all()


def reemplazar_autorreporte(conn, usuario_id: int, condiciones: dict[int, int]) -> None:
    """Deja activas exactamente las condiciones AUTORREPORTE indicadas {condicion_id: severidad}.
    Las de origen IMC solo las maneja el trigger de mediciones."""
    uc, c = tabla("usuario_condiciones"), tabla("condiciones")
    ids_auto = select(c.c.id).where(c.c.origen == "AUTORREPORTE")
    conn.execute(update(uc).where(uc.c.usuario_id == usuario_id, uc.c.condicion_id.in_(ids_auto))
                 .values(activa=False))
    for condicion_id, severidad in condiciones.items():
        existe = conn.execute(select(uc.c.usuario_id).where(
            and_(uc.c.usuario_id == usuario_id, uc.c.condicion_id == condicion_id))).first()
        if existe:
            conn.execute(update(uc).where(uc.c.usuario_id == usuario_id, uc.c.condicion_id == condicion_id)
                         .values(activa=True, severidad=severidad))
        else:
            conn.execute(insert(uc).values(usuario_id=usuario_id, condicion_id=condicion_id,
                                           severidad=severidad, activa=True))


def insertar_medicion(conn, usuario_id: int, datos: dict) -> int:
    return conn.execute(insert(tabla("mediciones_corporales"))
                        .values(usuario_id=usuario_id, **datos)).inserted_primary_key[0]


def medicion(conn, medicion_id: int):
    m = tabla("mediciones_corporales")
    return conn.execute(select(m).where(m.c.id == medicion_id)).first()


def borrar_mediciones(conn, usuario_id: int) -> None:
    m = tabla("mediciones_corporales")
    conn.execute(delete(m).where(m.c.usuario_id == usuario_id))
