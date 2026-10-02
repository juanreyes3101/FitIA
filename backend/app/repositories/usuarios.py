from sqlalchemy import func, insert, select, update

from app.db import tabla


def buscar_por_email(conn, email: str):
    u, r = tabla("usuarios"), tabla("roles")
    return conn.execute(select(u, r.c.codigo.label("rol")).join(r, r.c.id == u.c.rol_id)
                        .where(u.c.email == email)).first()


def obtener(conn, usuario_id: int):
    u, r = tabla("usuarios"), tabla("roles")
    return conn.execute(select(u, r.c.codigo.label("rol")).join(r, r.c.id == u.c.rol_id)
                        .where(u.c.id == usuario_id)).first()


def id_rol(conn, codigo: str) -> int:
    r = tabla("roles")
    return conn.execute(select(r.c.id).where(r.c.codigo == codigo)).scalar_one()


def crear(conn, datos: dict) -> int:
    return conn.execute(insert(tabla("usuarios")).values(**datos)).inserted_primary_key[0]


def actualizar(conn, usuario_id: int, cambios: dict) -> None:
    if cambios:
        u = tabla("usuarios")
        conn.execute(update(u).where(u.c.id == usuario_id).values(**cambios))


def marcar_acceso(conn, usuario_id: int) -> None:
    u = tabla("usuarios")
    conn.execute(update(u).where(u.c.id == usuario_id).values(ultimo_acceso=func.now()))


def listar(conn, rol: str | None = None, estado: str | None = None):
    u, r = tabla("usuarios"), tabla("roles")
    q = (select(u.c.id, u.c.nombres, u.c.apellidos, u.c.email, u.c.telefono, u.c.estado,
                u.c.creado_en, u.c.ultimo_acceso, r.c.codigo.label("rol"))
         .join(r, r.c.id == u.c.rol_id).order_by(u.c.id))
    if rol:
        q = q.where(r.c.codigo == rol)
    if estado:
        q = q.where(u.c.estado == estado)
    return conn.execute(q).all()


def crear_entrenador(conn, usuario_id: int) -> None:
    e = tabla("entrenadores")
    if not conn.execute(select(e.c.usuario_id).where(e.c.usuario_id == usuario_id)).first():
        conn.execute(insert(e).values(usuario_id=usuario_id))
