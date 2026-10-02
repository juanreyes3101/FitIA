from datetime import date

from tests.conftest import auth, login

PERFIL = {"nivel_actividad": "SEDENTARIO", "objetivo": "BAJAR_PESO", "dias_disponibles": 3,
          "minutos_por_sesion": 45}


def test_get_perfil_incluye_cupo_ia_y_datos_de_cuenta(client, crear_usuario):
    u = crear_usuario()
    token = login(client, u["email"], u["password"])["access_token"]
    datos = client.get("/api/v1/perfil", headers=auth(token)).get_json()
    assert datos["cupo_ia_restante"] == 2  # plan GRATIS sin solicitudes este mes
    assert datos["fecha_nacimiento"] == "2000-01-01"
    assert datos["sexo"] == "N"


def test_put_perfil_guarda_fecha_nacimiento_y_sexo(client, crear_usuario):
    u = crear_usuario()
    token = login(client, u["email"], u["password"])["access_token"]
    cuerpo = PERFIL | {"fecha_nacimiento": "1998-01-01", "sexo": "F",
                       "condiciones": [{"codigo": "DOLOR_LUMBAR", "severidad": 2}]}
    resp = client.put("/api/v1/perfil", json=cuerpo, headers=auth(token))
    assert resp.status_code == 200, resp.get_json()
    datos = resp.get_json()
    assert datos["sexo"] == "F" and datos["fecha_nacimiento"] == "1998-01-01"
    assert datos["perfil"]["objetivo"] == "BAJAR_PESO"
    assert [c["codigo"] for c in datos["condiciones"]] == ["DOLOR_LUMBAR"]


def test_put_perfil_rechaza_edad_fuera_de_rango(client, crear_usuario):
    u = crear_usuario()
    token = login(client, u["email"], u["password"])["access_token"]
    muy_joven = date(date.today().year - 10, 1, 1).isoformat()
    resp = client.put("/api/v1/perfil", json=PERFIL | {"fecha_nacimiento": muy_joven}, headers=auth(token))
    assert resp.status_code == 400
    assert resp.get_json()["error"]["codigo"] == "DATOS_INVALIDOS"
