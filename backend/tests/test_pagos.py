from sqlalchemy import text

from app.services.pagos import luhn_valido
from tests.conftest import auth, login

TARJETA_OK = "4242424242424242"


def tarjeta_terminada_en_0000() -> str:
    """Número de prueba que pasa Luhn y termina en 0000 (el SP lo rechaza por regla de simulación)."""
    for x in range(10 ** 8):
        numero = f"4111{x:08d}0000"
        if luhn_valido(numero):
            return numero
    raise AssertionError


def suscripciones(engine, uid):
    with engine.connect() as conn:
        return conn.execute(text("SELECT p.codigo, s.estado FROM suscripciones s JOIN planes p ON p.id = s.plan_id "
                                 "WHERE s.usuario_id = :u ORDER BY s.id"), {"u": uid}).all()


def test_luhn():
    assert luhn_valido(TARJETA_OK)
    assert not luhn_valido("4242424242424241")
    assert luhn_valido(tarjeta_terminada_en_0000())


def test_pago_aprobado_activa_pro(client, engine, crear_usuario):
    u = crear_usuario()
    token = login(client, u["email"], u["password"])["access_token"]
    resp = client.post("/api/v1/pagos/simular", headers=auth(token),
                       json={"plan_codigo": "PREMIUM_MES", "metodo": "TARJETA", "numero_tarjeta": TARJETA_OK})
    assert resp.status_code == 200, resp.get_json()
    datos = resp.get_json()
    assert datos["estado"] == "APROBADO" and datos["ultimos4"] == "4242"
    assert datos["suscripcion"]["codigo"] == "PREMIUM_MES"
    assert TARJETA_OK not in resp.get_data(as_text=True)
    assert [tuple(s) for s in suscripciones(engine, u["id"])] == [("GRATIS", "CANCELADA"), ("PREMIUM_MES", "ACTIVA")]
    with engine.connect() as conn:  # nunca se guarda el número completo
        assert conn.execute(text("SELECT ultimos4 FROM pagos WHERE id = :p"), {"p": datos["pago_id"]}).scalar() == "4242"

    # Con plan Pro ya no hay publicidad
    assert client.get("/api/v1/anuncios", headers=auth(token)).get_json()["anuncio"] is None


def test_pago_rechazado_0000_no_crea_suscripcion(client, engine, crear_usuario):
    u = crear_usuario()
    token = login(client, u["email"], u["password"])["access_token"]
    assert client.get("/api/v1/anuncios", headers=auth(token)).get_json()["anuncio"] is not None  # Free: con anuncios
    resp = client.post("/api/v1/pagos/simular", headers=auth(token), json={
        "plan_codigo": "PREMIUM_MES", "metodo": "TARJETA", "numero_tarjeta": tarjeta_terminada_en_0000()})
    assert resp.status_code == 200
    datos = resp.get_json()
    assert datos["estado"] == "RECHAZADO" and datos["motivo_rechazo"]
    assert [tuple(s) for s in suscripciones(engine, u["id"])] == [("GRATIS", "ACTIVA")]


def test_tarjeta_invalida_y_plan_inexistente(client, crear_usuario):
    u = crear_usuario()
    token = login(client, u["email"], u["password"])["access_token"]
    mala = client.post("/api/v1/pagos/simular", headers=auth(token),
                       json={"plan_codigo": "PREMIUM_MES", "metodo": "TARJETA", "numero_tarjeta": "1234"})
    assert mala.status_code == 400 and mala.get_json()["error"]["codigo"] == "TARJETA_INVALIDA"
    plan = client.post("/api/v1/pagos/simular", headers=auth(token), json={"plan_codigo": "NO_EXISTE", "metodo": "PSE"})
    assert plan.status_code == 404 and plan.get_json()["error"]["codigo"] == "PLAN_INEXISTENTE"


def test_planes_publico(client):
    codigos = {p["codigo"] for p in client.get("/api/v1/planes").get_json()}
    assert {"GRATIS", "PREMIUM_MES", "PREMIUM_ANUAL"} <= codigos
