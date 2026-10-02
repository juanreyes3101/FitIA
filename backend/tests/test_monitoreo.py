from sqlalchemy import text

from app.ai.circuit_breaker import ABIERTO, CERRADO, SEMIABIERTO, CircuitBreaker
from app.middleware import metricas
from tests.conftest import auth


def test_servicios_solo_admin(client, token_admin, token_laura):
    resp = client.get("/api/v1/monitoreo/servicios", headers=auth(token_admin))
    assert resp.status_code == 200
    assert {"api", "ia", "db", "web"} <= {s["codigo"] for s in resp.get_json()}
    assert client.get("/api/v1/monitoreo/servicios", headers=auth(token_laura)).status_code == 403


def test_simular_pico_y_banda(client, engine, token_admin):
    try:
        resp = client.post("/api/v1/monitoreo/simular-pico", headers=auth(token_admin),
                           json={"servicio": "web", "metrica": "LATENCIA_MS", "minutos": 10})
        assert resp.status_code == 201 and resp.get_json()["muestras_insertadas"] == 60
        serie = client.get("/api/v1/monitoreo/metricas?servicio=web&metrica=LATENCIA_MS&min=15",
                           headers=auth(token_admin)).get_json()
        assert serie["puntos"] and serie["resumen"]["muestras"] >= 60
        ultimo = serie["puntos"][-1]
        assert ultimo["valor"] > serie["puntos"][0]["banda_sup"]  # el pico se sale de la banda inicial
    finally:
        with engine.begin() as conn:
            conn.execute(text("DELETE m FROM metricas m JOIN servicios s ON s.id = m.servicio_id WHERE s.codigo = 'web'"))


def test_middleware_guarda_metricas_en_lote(app, client, engine):
    client.get("/api/v1/imc?peso=70&estatura=170")
    with engine.connect() as conn:
        antes = conn.execute(text("SELECT COUNT(*) FROM metricas")).scalar()
    assert metricas.flush(app) >= 2
    with engine.connect() as conn:
        assert conn.execute(text("SELECT COUNT(*) FROM metricas")).scalar() >= antes + 2


def test_reportes(client, token_admin):
    for nombre in ("ingresos", "uso-ia", "adherencia"):
        resp = client.get(f"/api/v1/reportes/{nombre}", headers=auth(token_admin))
        assert resp.status_code == 200, (nombre, resp.get_json())
    csv = client.get("/api/v1/reportes/ingresos?formato=csv", headers=auth(token_admin))
    assert csv.mimetype == "text/csv" and "total_cop" in csv.get_data(as_text=True)


def test_circuit_breaker():
    t = [0.0]
    cb = CircuitBreaker(max_fallos=3, enfriamiento_seg=300, reloj=lambda: t[0])
    cb.registrar_fallo(); cb.registrar_fallo()
    assert cb.estado == CERRADO
    cb.registrar_fallo()
    assert cb.estado == ABIERTO and not cb.permite()
    t[0] = 301
    assert cb.estado == SEMIABIERTO and cb.permite()
    cb.registrar_exito()
    assert cb.estado == CERRADO
    cb.registrar_fallo(abrir_ya=True)  # un 429 abre de inmediato
    assert cb.estado == ABIERTO
