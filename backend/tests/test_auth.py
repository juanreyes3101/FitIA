from sqlalchemy import delete, text

from tests.conftest import auth, login


def test_login_demo_devuelve_jwt_con_rol(client):
    datos = login(client, "laura@fitia.co", "Demo2026*")
    assert datos["access_token"] and datos["refresh_token"]
    assert datos["usuario"]["rol"] == "USUARIO"
    assert "password_hash" not in datos["usuario"]


def test_login_admin(client):
    assert login(client, "admin@fitia.co", "Admin2026*")["usuario"]["rol"] == "ADMIN"


def test_password_incorrecta_401_con_formato_unico(client):
    resp = client.post("/api/v1/auth/login", json={"email": "laura@fitia.co", "password": "malaClave1"})
    assert resp.status_code == 401
    assert resp.get_json() == {"error": {"codigo": "CREDENCIALES_INVALIDAS",
                                         "mensaje": "Correo o contraseña incorrectos."}}


def test_sin_token_401(client):
    resp = client.get("/api/v1/perfil")
    assert resp.status_code == 401
    assert resp.get_json()["error"]["codigo"] == "NO_AUTENTICADO"


def test_rol_incorrecto_403(client, token_laura):
    resp = client.get("/api/v1/monitoreo/servicios", headers=auth(token_laura))
    assert resp.status_code == 403
    assert resp.get_json()["error"]["codigo"] == "PROHIBIDO"


def test_registro_crea_usuario_con_plan_free_y_rechaza_duplicado(client, engine, md):
    email = "test_registro@pruebas.fitia.co"
    cuerpo = {"nombres": "Ana", "apellidos": "Prueba", "email": email, "password": "Segura2026*",
              "acepta_terminos": True}
    try:
        resp = client.post("/api/v1/auth/registro", json=cuerpo)
        assert resp.status_code == 201, resp.get_json()
        uid = resp.get_json()["usuario"]["id"]
        with engine.connect() as conn:
            plan = conn.execute(text("SELECT p.codigo FROM suscripciones s JOIN planes p ON p.id = s.plan_id "
                                     "WHERE s.usuario_id = :u AND s.estado = 'ACTIVA'"), {"u": uid}).scalar()
        assert plan == "GRATIS"
        dup = client.post("/api/v1/auth/registro", json=cuerpo)
        assert dup.status_code == 409 and dup.get_json()["error"]["codigo"] == "CORREO_EN_USO"
    finally:
        with engine.begin() as conn:
            conn.execute(delete(md.tables["usuarios"]).where(md.tables["usuarios"].c.email == email))


def test_registro_sin_aceptar_terminos(client):
    resp = client.post("/api/v1/auth/registro", json={"nombres": "A", "apellidos": "B", "email": "x@pruebas.fitia.co",
                                                      "password": "Segura2026*", "acepta_terminos": False})
    assert resp.status_code == 400 and resp.get_json()["error"]["codigo"] == "TERMINOS_NO_ACEPTADOS"


def test_refresh_emite_nuevo_access(client):
    refresh = login(client, "laura@fitia.co", "Demo2026*")["refresh_token"]
    resp = client.post("/api/v1/auth/refresh", headers=auth(refresh))
    assert resp.status_code == 200 and resp.get_json()["access_token"]
