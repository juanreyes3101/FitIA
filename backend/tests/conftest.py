"""Las pruebas corren contra la BD `fitia` real ya sembrada (schema.sql crea la BD con nombre fijo).
Aislamiento: cada prueba que escribe usa un usuario descartable `test_*` que se borra al final
(ON DELETE CASCADE limpia perfil, rutinas, pagos, etc.). Los usuarios demo no se modifican."""
import uuid
from datetime import date

import pytest
from sqlalchemy import delete, insert, select, text
from werkzeug.security import generate_password_hash

from app import create_app
from app.config import TestConfig

CLAVE_TEST = "Prueba2026*"


@pytest.fixture(scope="session")
def app():
    return create_app(TestConfig())


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def engine(app):
    return app.extensions["fitia_engine"]


@pytest.fixture
def md(app):
    return app.extensions["fitia_metadata"]


def login(client, email: str, password: str) -> dict:
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.get_json()
    return resp.get_json()


def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def token_laura(client):
    return login(client, "laura@fitia.co", "Demo2026*")["access_token"]


@pytest.fixture
def token_admin(client):
    return login(client, "admin@fitia.co", "Admin2026*")["access_token"]


@pytest.fixture
def token_coach(client):
    return login(client, "coach@fitia.co", "Demo2026*")["access_token"]


@pytest.fixture
def crear_usuario(app, engine, md):
    """Fábrica de usuarios descartables con perfil y plan GRATIS. Se borran al terminar la prueba."""
    creados: list[int] = []

    def _crear(nivel="MODERADO", objetivo="TONIFICAR", dias=3, minutos=45, condiciones=(), peso=None):
        u, p, s, pl = md.tables["usuarios"], md.tables["perfiles_salud"], md.tables["suscripciones"], md.tables["planes"]
        email = f"test_{uuid.uuid4().hex[:10]}@pruebas.fitia.co"
        with engine.begin() as conn:
            rol = conn.execute(text("SELECT id FROM roles WHERE codigo='USUARIO'")).scalar_one()
            uid = conn.execute(insert(u).values(
                rol_id=rol, nombres="Test", apellidos="Descartable", email=email,
                password_hash=generate_password_hash(CLAVE_TEST), fecha_nacimiento=date(2000, 1, 1),
                acepta_terminos=True)).inserted_primary_key[0]
            conn.execute(insert(p).values(usuario_id=uid, nivel_actividad=nivel, objetivo=objetivo,
                                          dias_disponibles=dias, minutos_por_sesion=minutos))
            plan = conn.execute(select(pl.c.id).where(pl.c.codigo == "GRATIS")).scalar_one()
            conn.execute(insert(s).values(usuario_id=uid, plan_id=plan, fecha_inicio=date.today()))
            for codigo, sev in condiciones:
                conn.execute(text("INSERT INTO usuario_condiciones (usuario_id, condicion_id, severidad) "
                                  "SELECT :u, id, :s FROM condiciones WHERE codigo = :c"),
                             {"u": uid, "s": sev, "c": codigo})
            if peso:
                conn.execute(text("INSERT INTO mediciones_corporales (usuario_id, peso_kg, estatura_cm) "
                                  "VALUES (:u, :p, 170)"), {"u": uid, "p": peso})
        creados.append(uid)
        return {"id": uid, "email": email, "password": CLAVE_TEST}

    yield _crear
    app.extensions["fitia_ia"].cache.limpiar()
    with engine.begin() as conn:
        for uid in creados:
            conn.execute(delete(md.tables["auditoria"]).where(md.tables["auditoria"].c.usuario_id == uid))
            conn.execute(delete(md.tables["usuarios"]).where(md.tables["usuarios"].c.id == uid))
