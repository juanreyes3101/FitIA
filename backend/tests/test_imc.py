import pytest


@pytest.mark.parametrize("peso,estatura,clasificacion", [
    (50, 175, "BAJO_PESO"), (65, 170, "NORMAL"), (78, 165, "SOBREPESO"), (110, 170, "OBESIDAD")])
def test_imc_clasifica_segun_oms(client, peso, estatura, clasificacion):
    resp = client.get(f"/api/v1/imc?peso={peso}&estatura={estatura}")
    assert resp.status_code == 200
    datos = resp.get_json()
    assert datos["clasificacion"] == clasificacion
    assert datos["imc"] == round(peso / (estatura / 100) ** 2, 2)


@pytest.mark.parametrize("query", ["", "?peso=70", "?peso=abc&estatura=170", "?peso=70&estatura=20"])
def test_imc_parametros_invalidos(client, query):
    resp = client.get(f"/api/v1/imc{query}")
    assert resp.status_code == 400
    assert resp.get_json()["error"]["codigo"] == "DATOS_INVALIDOS"


def test_health(client):
    resp = client.get("/api/v1/health")
    assert resp.status_code == 200 and resp.get_json()["bd"] == "OK"
