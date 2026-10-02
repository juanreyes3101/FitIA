from datetime import date

from flask_jwt_extended import create_access_token, create_refresh_token
from sqlalchemy import insert, select
from werkzeug.security import check_password_hash, generate_password_hash

from app.db import engine, tabla
from app.errors import ApiError
from app.repositories import usuarios as repo


def emitir_tokens(usuario_id: int, rol: str) -> dict:
    claims = {"rol": rol}
    return {"access_token": create_access_token(identity=str(usuario_id), additional_claims=claims),
            "refresh_token": create_refresh_token(identity=str(usuario_id), additional_claims=claims),
            "token_type": "Bearer", "expira_en_seg": 3600}


def usuario_publico(fila) -> dict:
    return {"id": fila.id, "nombres": fila.nombres, "apellidos": fila.apellidos, "email": fila.email,
            "rol": fila.rol, "estado": fila.estado}


def registrar(datos) -> dict:
    if not datos.acepta_terminos:
        raise ApiError("TERMINOS_NO_ACEPTADOS",
                       "Debes aceptar el tratamiento de tus datos (Ley 1581 de 2012) para registrarte.", 400)
    with engine().begin() as conn:
        if repo.buscar_por_email(conn, datos.email.lower()):
            raise ApiError("CORREO_EN_USO", "Ya existe una cuenta con ese correo.", 409)
        usuario_id = repo.crear(conn, {
            "rol_id": repo.id_rol(conn, "USUARIO"), "nombres": datos.nombres.strip(),
            "apellidos": datos.apellidos.strip(), "email": datos.email.lower(),
            "password_hash": generate_password_hash(datos.password), "telefono": datos.telefono,
            "fecha_nacimiento": datos.fecha_nacimiento, "sexo": datos.sexo, "acepta_terminos": True})
        planes = tabla("planes")
        plan_id = conn.execute(select(planes.c.id).where(planes.c.codigo == "GRATIS")).scalar_one()
        conn.execute(insert(tabla("suscripciones")).values(usuario_id=usuario_id, plan_id=plan_id,
                                                           fecha_inicio=date.today(), estado="ACTIVA"))
        fila = repo.obtener(conn, usuario_id)
    return {"usuario": usuario_publico(fila)} | emitir_tokens(usuario_id, fila.rol)


def login(email: str, password: str) -> dict:
    with engine().begin() as conn:
        fila = repo.buscar_por_email(conn, email.lower())
        if not fila or not check_password_hash(fila.password_hash, password):
            raise ApiError("CREDENCIALES_INVALIDAS", "Correo o contraseña incorrectos.", 401)
        if fila.estado != "ACTIVO":
            raise ApiError("CUENTA_INACTIVA", "Tu cuenta está inactiva o bloqueada. Habla con el gimnasio.", 403)
        repo.marcar_acceso(conn, fila.id)
    return {"usuario": usuario_publico(fila)} | emitir_tokens(fila.id, fila.rol)


def refrescar(usuario_id: int) -> dict:
    with engine().connect() as conn:
        fila = repo.obtener(conn, usuario_id)
    if not fila or fila.estado != "ACTIVO":
        raise ApiError("NO_AUTENTICADO", "Tu cuenta no está activa.", 401)
    return {"access_token": create_access_token(identity=str(usuario_id), additional_claims={"rol": fila.rol}),
            "token_type": "Bearer", "expira_en_seg": 3600}
