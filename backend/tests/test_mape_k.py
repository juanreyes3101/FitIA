"""Ciclo MAPE-K: detector (Pandas), políticas y el ciclo completo contra la BD con el servicio `web`."""
from datetime import datetime, timedelta

import numpy as np
import pytest
from sqlalchemy import text

from app.monitoring import analisis, politicas
from app.monitoring.mape_k import Parametros, ejecutar_ciclo
from app.repositories import monitoreo as repo
from tests.conftest import auth

P = Parametros(intervalo_seg=60, ventana_min=30, umbral_z=3.0, umbral_error=0.05, enfriamiento_seg=300)
WEB = politicas.ServicioEstado("web", 1, 1, 4)


@pytest.fixture(autouse=True)
def _contexto(app):
    """El repositorio usa `tabla()`, que lee la metadata reflejada de la app."""
    with app.app_context():
        yield


def _serie_normal(fin: datetime, minutos: int = 30, semilla: int = 7):
    rng = np.random.default_rng(semilla)
    n = minutos * 6
    return [(fin - timedelta(seconds=10 * (n - 1 - i)), float(v)) for i, v in enumerate(rng.normal(120, 15, n))]


# ---------------------------------------------------------------- detector (puro)
def test_serie_normal_no_da_anomalias():
    ahora = datetime(2026, 10, 3, 10, 0, 0)
    serie = _serie_normal(ahora, minutos=40)
    for corte in range(30 * 6, len(serie), 6):  # cada minuto, ventana de 30 min
        historia, actual = serie[corte - 180:corte], serie[corte:corte + 6]
        base = analisis.linea_base(historia)
        assert analisis.detectar(analisis.valor_actual(actual), base, "LATENCIA_MS") is None


def test_pico_de_5_sigma_es_alta():
    base = analisis.linea_base(_serie_normal(datetime(2026, 10, 3, 10, 0, 0)))
    pico = base.media + 5.5 * base.desviacion
    det = analisis.detectar(pico, base, "LATENCIA_MS")
    assert det is not None and det.severidad == "ALTA" and det.zscore > 5


def test_severidad_en_los_bordes():
    assert analisis.severidad(3.5, "LATENCIA_MS", 0, 0.05) == "BAJA"
    assert analisis.severidad(4.5, "LATENCIA_MS", 0, 0.05) == "MEDIA"
    assert analisis.severidad(5.01, "LATENCIA_MS", 0, 0.05) == "ALTA"
    assert analisis.severidad(1.0, "TASA_ERROR", 0.08, 0.05) == "MEDIA"
    assert analisis.severidad(9.0, "TASA_ERROR", 0.6, 0.05) == "CRITICA"


def test_latencia_baja_no_es_anomalia():
    base = analisis.LineaBase(media=120, desviacion=15, p95=145, muestras=180)
    assert analisis.detectar(5.0, base, "LATENCIA_MS") is None  # z = -7.7: un solo lado
    assert analisis.detectar(0.07, analisis.LineaBase(0.01, 0.05, 0.02, 100), "TASA_ERROR") is not None


# ---------------------------------------------------------------- políticas (puro)
def test_politicas():
    ahora = datetime(2026, 10, 3, 10, 0, 0)
    plan = politicas.planificar(WEB, "LATENCIA_MS", "ALTA", None, ahora, 300)
    assert [(a.tipo, a.replicas_antes, a.replicas_despues) for a in plan] == [("ESCALAR_ARRIBA", 1, 2)]

    al_maximo = politicas.ServicioEstado("web", 4, 1, 4)
    assert [a.tipo for a in politicas.planificar(al_maximo, "LATENCIA_MS", "ALTA", None, ahora, 300)] == \
        ["NOTIFICAR_ADMIN"]

    reciente = ahora - timedelta(seconds=100)
    plan = politicas.planificar(WEB, "LATENCIA_MS", "ALTA", reciente, ahora, 300)
    assert plan[0].tipo == "NOTIFICAR_ADMIN" and "faltan 200 s" in plan[0].detalle

    ia = politicas.ServicioEstado("ia", 1, 1, 3)
    assert [a.tipo for a in politicas.planificar(ia, "LATENCIA_MS", "MEDIA", None, ahora, 300)] == \
        ["CAMBIAR_PROVEEDOR_IA"]
    assert [a.tipo for a in politicas.planificar(WEB, "TASA_ERROR", "CRITICA", None, ahora, 300)] == \
        ["REINICIAR_WORKER", "NOTIFICAR_ADMIN"]


def test_politica_de_retorno():
    ahora = datetime(2026, 10, 3, 10, 0, 0)
    escalado = politicas.ServicioEstado("web", 3, 1, 4)
    assert politicas.planificar_retorno(escalado, 1, ahora - timedelta(seconds=60), ahora, 300) is None
    plan = politicas.planificar_retorno(escalado, 1, ahora - timedelta(seconds=301), ahora, 300)
    assert (plan.tipo, plan.replicas_antes, plan.replicas_despues) == ("ESCALAR_ABAJO", 3, 2)
    assert politicas.planificar_retorno(politicas.ServicioEstado("web", 1, 1, 4), 1, None, ahora, 300) is None


# ---------------------------------------------------------------- ciclo completo (BD)
def _insertar(engine, sid: int, muestras) -> None:
    with engine.begin() as conn:
        repo.insertar_metricas(conn, [{"servicio_id": sid, "metrica": "LATENCIA_MS", "valor": round(v, 4),
                                       "registrado_en": t} for t, v in muestras])


def _ciclo(engine, ahora):
    with engine.begin() as conn:
        return ejecutar_ciclo(conn, P, ahora=ahora, servicios=["web"], con_monitor=False)


def _servicio(engine):
    with engine.connect() as conn:
        return conn.execute(text("SELECT id, replicas_actuales, estado FROM servicios WHERE codigo='web'")).one()


def test_ciclo_mape_k_completo(engine, servicio_web):
    sid = _servicio(engine).id
    t1 = datetime.now().replace(microsecond=0)

    # 1. Serie normal → 0 anomalías, pero sí línea base (Knowledge)
    normal = _serie_normal(t1)
    _insertar(engine, sid, normal)
    r = _ciclo(engine, t1)
    assert r["anomalias"] == [] and r["acciones"] == [] and r["lineas_base"] == 1

    # 2. Pico en el último intervalo, por encima de 5σ → 1 anomalía ALTA + ESCALAR_ARRIBA
    base = analisis.linea_base(normal)
    t2 = t1 + timedelta(seconds=60)
    _insertar(engine, sid, [(t1 + timedelta(seconds=10 * i), base.media + 6 * base.desviacion) for i in range(1, 7)])
    r = _ciclo(engine, t2)
    assert [(a["metrica"], a["severidad"]) for a in r["anomalias"]] == [("LATENCIA_MS", "ALTA")]
    assert [(a["tipo"], a["replicas_antes"], a["replicas_despues"]) for a in r["acciones"]] == \
        [("ESCALAR_ARRIBA", 1, 2)]
    assert tuple(_servicio(engine))[1:] == (2, "DEGRADADO")
    anomalia_id = r["anomalias"][0]["id"]

    # Otro ciclo con el pico todavía en la ventana no duplica la anomalía ni la acción (enfriamiento)
    r = _ciclo(engine, t2)
    assert r["anomalias"] == [] and r["acciones"] == [] and r["mitigadas"] == []

    # 3. Vuelve la normalidad → MITIGADA (verificación contra su línea base guardada)
    t3 = t2 + timedelta(seconds=60)
    _insertar(engine, sid, [(t2 + timedelta(seconds=10 * i), 118.0 + i) for i in range(1, 7)])
    r = _ciclo(engine, t3)
    assert [m["id"] for m in r["mitigadas"]] == [anomalia_id] and r["anomalias"] == []
    with engine.connect() as conn:
        fila = conn.execute(text("SELECT estado, resuelta_en FROM anomalias WHERE id = :i"), {"i": anomalia_id}).one()
    assert fila.estado == "MITIGADA" and fila.resuelta_en is not None
    assert tuple(_servicio(engine))[1:] == (2, "SALUDABLE")

    # 4. Pasado el enfriamiento, se devuelven las réplicas del incidente
    r = _ciclo(engine, t2 + timedelta(seconds=301))
    assert [(a["tipo"], a["replicas_despues"]) for a in r["acciones"]] == [("ESCALAR_ABAJO", 1)]
    assert _servicio(engine).replicas_actuales == 1


def test_ia_forzada_a_mock(engine):
    with engine.begin() as conn:
        sid = conn.execute(text("SELECT id FROM servicios WHERE codigo='ia'")).scalar_one()
        an = repo.insertar_anomalia(conn, sid, None, "TASA_ERROR", 0.8, 0.01, 50.0, "CRITICA", datetime.now())
        repo.insertar_accion(conn, an, politicas.AccionPlan("CAMBIAR_PROVEEDOR_IA", "prueba"), datetime.now())
    try:
        with engine.connect() as conn:
            assert repo.ia_forzada_a_mock(conn)
        with engine.begin() as conn:
            repo.marcar_mitigada(conn, an)
        with engine.connect() as conn:
            assert not repo.ia_forzada_a_mock(conn)
    finally:
        with engine.begin() as conn:
            conn.execute(text("DELETE FROM anomalias WHERE id = :i"), {"i": an})


# ---------------------------------------------------------------- endpoints
def test_simular_pico_dispara_el_ciclo(client, token_admin, servicio_web):
    resp = client.post("/api/v1/monitoreo/simular-pico", headers=auth(token_admin),
                       json={"servicio": "web", "metrica": "LATENCIA_MS"})
    assert resp.status_code == 201, resp.get_json()
    ciclo = resp.get_json()["ciclo"]
    assert [(a["servicio"], a["severidad"]) for a in ciclo["anomalias"]] == [("web", "ALTA")]
    assert [a["tipo"] for a in ciclo["acciones"]] == ["ESCALAR_ARRIBA"]
    abiertas = client.get("/api/v1/monitoreo/anomalias?estado=ABIERTA", headers=auth(token_admin)).get_json()
    assert any(a["id"] == ciclo["anomalias"][0]["id"] for a in abiertas)
    bitacora = client.get("/api/v1/monitoreo/acciones?limite=5", headers=auth(token_admin)).get_json()
    assert bitacora[0]["tipo"] == "ESCALAR_ARRIBA" and bitacora[0]["servicio"] == "web"


def test_estado_del_monitor(client, token_admin, token_laura):
    resp = client.get("/api/v1/monitoreo/estado", headers=auth(token_admin))
    assert resp.status_code == 200
    datos = resp.get_json()
    assert {"intervalo_seg", "umbral_z", "ventana_min", "enfriamiento_seg", "worker", "ia", "lineas_base"} <= set(datos)
    assert datos["ia"]["efectivo"] == "mock"  # TestConfig usa mock
    assert client.get("/api/v1/monitoreo/estado", headers=auth(token_laura)).status_code == 403


def test_metricas_con_paso_y_servicios_con_limites(client, token_admin):
    ok = client.get("/api/v1/monitoreo/metricas?servicio=api&paso=10s&min=15", headers=auth(token_admin))
    assert ok.status_code == 200 and ok.get_json()["paso"] == "10s"
    assert client.get("/api/v1/monitoreo/metricas?paso=2h", headers=auth(token_admin)).status_code == 400
    servicios = client.get("/api/v1/monitoreo/servicios", headers=auth(token_admin)).get_json()
    api = next(s for s in servicios if s["codigo"] == "api")
    assert api["replicas_min"] <= api["replicas_actuales"] <= api["replicas_max"]


def test_admin_condiciones_y_usuarios_con_imc(client, token_admin, token_laura):
    resp = client.get("/api/v1/admin/condiciones", headers=auth(token_admin))
    assert resp.status_code == 200
    assert {"BAJO_PESO", "SOBREPESO", "OBESIDAD", "DOLOR_LUMBAR", "DOLOR_RODILLA", "HIPERTENSION"} <= \
        {c["codigo"] for c in resp.get_json()}
    assert client.get("/api/v1/admin/condiciones", headers=auth(token_laura)).status_code == 403
    usuarios = client.get("/api/v1/admin/usuarios", headers=auth(token_admin)).get_json()
    laura = next(u for u in usuarios if u["email"] == "laura@fitia.co")
    assert laura["imc"] and laura["clasificacion_imc"] and "plan" in laura
