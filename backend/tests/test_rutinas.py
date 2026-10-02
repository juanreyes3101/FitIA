import pytest
from sqlalchemy import delete, text, update
from sqlalchemy.exc import OperationalError

from app.ai.schema import RutinaIA
from tests.conftest import auth, login

LAURA_ID = 3


@pytest.fixture
def limpiar_generadas_laura(app, engine, md):
    """Deja los datos de Laura como estaban: borra lo que cree la prueba. Si ya gastó su cupo del mes
    (p. ej. tras la demo), sus solicitudes OK del mes se marcan ERROR durante la prueba y luego se restauran."""
    s, r = md.tables["solicitudes_ia"], md.tables["rutinas"]
    with engine.begin() as conn:
        max_rutina = conn.execute(text("SELECT COALESCE(MAX(id), 0) FROM rutinas")).scalar()
        max_sol = conn.execute(text("SELECT COALESCE(MAX(id), 0) FROM solicitudes_ia")).scalar()
        prestadas = list(conn.execute(text(
            "SELECT id FROM solicitudes_ia WHERE usuario_id = :u AND estado = 'OK' "
            "AND creado_en >= DATE_FORMAT(CURRENT_DATE, '%Y-%m-01')"), {"u": LAURA_ID}).scalars())
        if prestadas:
            conn.execute(update(s).where(s.c.id.in_(prestadas)).values(estado="ERROR"))
        vigentes = list(conn.execute(text("SELECT id, estado FROM rutinas WHERE usuario_id = :u"),
                                     {"u": LAURA_ID}).all())
    yield
    app.extensions["fitia_ia"].cache.limpiar()
    with engine.begin() as conn:
        conn.execute(delete(s).where(s.c.usuario_id == LAURA_ID, s.c.id > max_sol))
        conn.execute(delete(r).where(r.c.usuario_id == LAURA_ID, r.c.id > max_rutina))
        if prestadas:
            conn.execute(update(s).where(s.c.id.in_(prestadas)).values(estado="OK"))
        for rutina_id, estado in vigentes:  # generar archiva las VALIDADA previas: se restauran
            conn.execute(update(r).where(r.c.id == rutina_id).values(estado=estado))


def test_generar_rutina_laura_con_mock(client, engine, token_laura, limpiar_generadas_laura):
    resp = client.post("/api/v1/rutinas/generar", headers=auth(token_laura))
    assert resp.status_code == 201, resp.get_json()
    datos = resp.get_json()
    assert datos["estado"] == "VALIDADA" and datos["proveedor"] == "mock" and datos["desde_cache"] is False

    # Cumple el esquema pydantic de la sección 5
    RutinaIA.model_validate({"nombre": datos["nombre"], "semanas": datos["semanas"],
                             "explicacion": datos["explicacion"], "dias": datos["dias"]})
    assert len(datos["dias"]) == 3  # dias_disponibles de Laura

    with engine.connect() as conn:
        seguros = {f.id for f in conn.execute(text("CALL sp_ejercicios_seguros(3)"))}
        sol = conn.execute(text("SELECT proveedor, estado FROM solicitudes_ia WHERE rutina_id = :r"),
                           {"r": datos["id"]}).all()
    usados = {e["ejercicio_id"] for d in datos["dias"] for e in d["ejercicios"]}
    assert usados <= seguros
    assert [tuple(f) for f in sol] == [("mock", "OK")]

    # Laura tiene DOLOR_LUMBAR: cada día lleva movilidad/estiramiento apto y termina en estiramiento
    for dia in datos["dias"]:
        assert any(e["apto_lumbar"] and e["tipo"] in ("MOVILIDAD", "ESTIRAMIENTO") for e in dia["ejercicios"])
        assert dia["ejercicios"][-1]["tipo"] == "ESTIRAMIENTO"

    # Segunda llamada: sale de la caché, sin gastar cupo ni registrar otra solicitud
    otra = client.post("/api/v1/rutinas/generar", headers=auth(token_laura))
    assert otra.status_code == 200 and otra.get_json()["desde_cache"] is True
    assert otra.get_json()["id"] == datos["id"]
    with engine.connect() as conn:
        assert conn.execute(text("SELECT COUNT(*) FROM solicitudes_ia WHERE usuario_id = 3 AND rutina_id = :r"),
                            {"r": datos["id"]}).scalar() == 1

    activa = client.get("/api/v1/rutinas/activa", headers=auth(token_laura)).get_json()
    assert activa["id"] == datos["id"]


def test_cupo_agotado(client, engine, crear_usuario):
    u = crear_usuario()
    with engine.begin() as conn:  # plan GRATIS = 2 rutinas/mes → se gastan las dos
        for _ in range(2):
            conn.execute(text("INSERT INTO solicitudes_ia (usuario_id, proveedor, modelo, estado) "
                              "VALUES (:u, 'mock', 'reglas-v1', 'OK')"), {"u": u["id"]})
    token = login(client, u["email"], u["password"])["access_token"]
    resp = client.post("/api/v1/rutinas/generar", headers=auth(token))
    assert resp.status_code == 402
    assert resp.get_json()["error"]["codigo"] == "CUPO_IA_AGOTADO"


def test_perfil_incompleto(client, engine, crear_usuario):
    u = crear_usuario()
    with engine.begin() as conn:
        conn.execute(text("DELETE FROM perfiles_salud WHERE usuario_id = :u"), {"u": u["id"]})
    token = login(client, u["email"], u["password"])["access_token"]
    resp = client.post("/api/v1/rutinas/generar", headers=auth(token))
    assert resp.status_code == 400 and resp.get_json()["error"]["codigo"] == "PERFIL_INCOMPLETO"


def test_trigger_bloquea_ejercicio_contraindicado(engine):
    """3.ª capa: aunque se salten la IA y el validador, MySQL rechaza el peso muerto para Laura."""
    with engine.connect() as conn:
        dia = conn.execute(text("SELECT rd.id FROM rutina_dias rd JOIN rutinas r ON r.id = rd.rutina_id "
                                "WHERE r.usuario_id = 3 ORDER BY rd.id LIMIT 1")).scalar()
        with pytest.raises(OperationalError) as exc:
            conn.execute(text("INSERT INTO rutina_ejercicios (rutina_dia_id, ejercicio_id, orden, series, repeticiones) "
                              "VALUES (:d, 5, 99, 3, 8)"), {"d": dia})
        conn.rollback()
    assert exc.value.orig.args[0] == 1644


def test_entrenador_aprueba_rutina(client, crear_usuario, token_coach):
    u = crear_usuario(nivel="LIGERO", objetivo="GANAR_MASA", dias=2, minutos=40, condiciones=[("DOLOR_RODILLA", 2)])
    token = login(client, u["email"], u["password"])["access_token"]
    rutina = client.post("/api/v1/rutinas/generar", headers=auth(token)).get_json()
    assert rutina["estado"] == "VALIDADA"
    assert all(e["impacto"] != "ALTO" for d in rutina["dias"] for e in d["ejercicios"])

    pendientes = client.get("/api/v1/entrenador/rutinas-pendientes", headers=auth(token_coach)).get_json()
    assert rutina["id"] in {p["id"] for p in pendientes}

    # Usuario normal no puede revisar
    assert client.patch(f"/api/v1/entrenador/rutinas/{rutina['id']}", headers=auth(token),
                        json={"accion": "APROBAR"}).status_code == 403

    ej = rutina["dias"][0]["ejercicios"][1]
    resp = client.patch(f"/api/v1/entrenador/rutinas/{rutina['id']}", headers=auth(token_coach), json={
        "accion": "APROBAR", "observaciones": "Bien, bajé una serie.",
        "ajustes": [{"rutina_ejercicio_id": ej["rutina_ejercicio_id"], "series": 2}]})
    assert resp.status_code == 200, resp.get_json()
    datos = resp.get_json()
    assert datos["estado"] == "ACTIVA" and datos["entrenador_revisor_id"] == 2
    assert datos["dias"][0]["ejercicios"][1]["series"] == 2


def test_sesion_y_progreso(client, crear_usuario):
    u = crear_usuario(peso=70)
    token = login(client, u["email"], u["password"])["access_token"]
    rutina = client.post("/api/v1/rutinas/generar", headers=auth(token)).get_json()
    dia = rutina["dias"][0]
    resp = client.post("/api/v1/sesiones", headers=auth(token), json={
        "rutina_dia_id": dia["rutina_dia_id"], "duracion_min": 40, "esfuerzo_percibido": 7, "dolor_reportado": 6,
        "ejercicios": [{"ejercicio_id": dia["ejercicios"][0]["ejercicio_id"], "series_hechas": 1}]})
    assert resp.status_code == 201, resp.get_json()
    assert resp.get_json()["alerta_dolor"] is True

    # No puede registrar sesiones en días de rutina ajenos (día 1 de la rutina de Laura)
    ajeno = client.post("/api/v1/sesiones", headers=auth(token), json={"rutina_dia_id": 1, "esfuerzo_percibido": 5})
    assert ajeno.status_code == 404

    progreso = client.get("/api/v1/progreso?dias=30", headers=auth(token)).get_json()
    assert len(progreso["corporal"]) == 1 and progreso["adherencia_semanal"][0]["sesiones"] == 1


def test_perfil_y_medicion_actualiza_condiciones(client, crear_usuario):
    u = crear_usuario()
    token = login(client, u["email"], u["password"])["access_token"]
    resp = client.put("/api/v1/perfil", headers=auth(token), json={
        "nivel_actividad": "SEDENTARIO", "objetivo": "ALIVIAR_LUMBAR", "dias_disponibles": 3,
        "minutos_por_sesion": 30, "condiciones": [{"codigo": "DOLOR_LUMBAR", "severidad": 2}]})
    assert resp.status_code == 200, resp.get_json()
    assert {c["codigo"] for c in resp.get_json()["condiciones"]} == {"DOLOR_LUMBAR"}

    # Las condiciones de IMC no se pueden autorreportar
    mala = client.put("/api/v1/perfil", headers=auth(token), json={
        "nivel_actividad": "SEDENTARIO", "objetivo": "BAJAR_PESO", "dias_disponibles": 3, "minutos_por_sesion": 30,
        "condiciones": [{"codigo": "OBESIDAD"}]})
    assert mala.status_code == 400

    med = client.post("/api/v1/perfil/mediciones", headers=auth(token), json={"peso_kg": 80, "estatura_cm": 170})
    assert med.status_code == 201
    datos = med.get_json()
    assert datos["medicion"]["clasificacion"] == "SOBREPESO"
    assert {c["codigo"] for c in datos["condiciones"]} == {"DOLOR_LUMBAR", "SOBREPESO"}  # trigger de mediciones


def test_ejercicios_seguros_excluye_contraindicados(client, token_laura):
    seguros = client.get("/api/v1/ejercicios/seguros", headers=auth(token_laura)).get_json()
    ids = {e["id"] for e in seguros}
    assert 5 not in ids and 2 not in ids and 22 in ids
    lumbar = client.get("/api/v1/ejercicios?lumbar=true&tipo=MOVILIDAD", headers=auth(token_laura)).get_json()
    assert lumbar and all(e["apto_lumbar"] and e["tipo"] == "MOVILIDAD" for e in lumbar)
