"""Las 7 reglas del ValidadorSeguridad, sin base de datos (código puro)."""
import pytest

from app.ai.mock import MockProvider
from app.ai.schema import CondicionAnonima, EjercicioCatalogo, PerfilAnonimo, RutinaIA
from app.services.validador import ContextoValidacion, ValidadorSeguridad

# Subconjunto del catálogo de seed.sql: (id, nombre, tipo, dificultad, impacto, apto_lumbar)
CATALOGO = [EjercicioCatalogo(id=i, nombre=n, tipo=t, dificultad=d, impacto=im, apto_lumbar=l) for i, n, t, d, im, l in [
    (2, "Sentadilla con barra", "FUERZA", "INTERMEDIO", "ALTO", False),
    (3, "Prensa de piernas", "FUERZA", "PRINCIPIANTE", "BAJO", False),
    (5, "Peso muerto con barra", "FUERZA", "AVANZADO", "ALTO", False),
    (6, "Puente de glúteo", "FUERZA", "PRINCIPIANTE", "BAJO", True),
    (11, "Jalón al pecho en polea", "FUERZA", "PRINCIPIANTE", "BAJO", False),
    (17, "Plancha frontal", "CORE", "PRINCIPIANTE", "BAJO", True),
    (18, "Dead bug", "CORE", "PRINCIPIANTE", "BAJO", True),
    (22, "Caminata en cinta inclinada", "CARDIO", "PRINCIPIANTE", "BAJO", True),
    (23, "Bicicleta estática", "CARDIO", "PRINCIPIANTE", "BAJO", True),
    (25, "Saltos de tijera", "CARDIO", "PRINCIPIANTE", "ALTO", False),
    (28, "Gato-camello", "MOVILIDAD", "PRINCIPIANTE", "BAJO", True),
    (29, "Postura del niño", "ESTIRAMIENTO", "PRINCIPIANTE", "BAJO", True),
    (30, "Rodillas al pecho", "ESTIRAMIENTO", "PRINCIPIANTE", "BAJO", True),
    (33, "Rotación lumbar acostado", "MOVILIDAD", "PRINCIPIANTE", "BAJO", True),
]]
CONTRAINDICACIONES = {2: {"DOLOR_LUMBAR", "DOLOR_RODILLA", "HIPERTENSION"}, 5: {"DOLOR_LUMBAR", "OBESIDAD"},
                      25: {"OBESIDAD", "DOLOR_RODILLA"}}


def perfil(nivel="MODERADO", condiciones=(), dias=1, minutos=45, objetivo="TONIFICAR"):
    return PerfilAnonimo(edad=30, imc=24.0, clasificacion_imc="NORMAL", nivel_actividad=nivel, objetivo=objetivo,
                         condiciones=[CondicionAnonima(codigo=c, severidad=1) for c in condiciones],
                         dias_disponibles=dias, minutos_por_sesion=minutos, lugar_entreno="GIMNASIO")


def contexto(p: PerfilAnonimo, permitir_todo=True) -> ContextoValidacion:
    """permitir_todo=True simula un catálogo sin filtrar, para probar las reglas 2-7 por separado."""
    catalogo = CATALOGO if permitir_todo else [e for e in CATALOGO
                                               if not CONTRAINDICACIONES.get(e.id, set()) & {c.codigo for c in p.condiciones}]
    return ContextoValidacion(perfil=p, catalogo={e.id: e for e in catalogo}, contraindicaciones=CONTRAINDICACIONES,
                              ejercicios_existentes={e.id for e in CATALOGO})


def rutina(*dias) -> RutinaIA:
    """Cada día es una lista de (ejercicio_id, series)."""
    return RutinaIA.model_validate({
        "nombre": "Prueba", "semanas": 4, "explicacion": "Rutina de prueba.",
        "dias": [{"dia_numero": n + 1, "enfoque": "General",
                  "ejercicios": [{"ejercicio_id": eid, "orden": o + 1, "series": s, "repeticiones": 10,
                                  "descanso_seg": 30} for o, (eid, s) in enumerate(ejs)]}
                 for n, ejs in enumerate(dias)]})


def reglas(errores: list[str]) -> set[int]:
    return {int(e.split(":")[0].removeprefix("Regla ")) for e in errores}


def test_rutina_segura_pasa_las_7_reglas():
    p = perfil()
    errores = ValidadorSeguridad().validar(rutina([(23, 1), (3, 3), (17, 3), (29, 2)]), contexto(p))
    assert errores == []


def test_ejercicio_contraindicado_activa_regla_2():
    p = perfil(condiciones=("DOLOR_LUMBAR",))
    errores = ValidadorSeguridad().validar(rutina([(23, 1), (2, 3), (28, 2), (29, 2)]), contexto(p))
    assert 2 in reglas(errores)
    assert any("ejercicio 2" in e and "DOLOR_LUMBAR" in e for e in errores)


def test_ejercicio_fuera_del_catalogo_activa_regla_1():
    p = perfil(condiciones=("DOLOR_LUMBAR",))
    errores = ValidadorSeguridad().validar(rutina([(2, 3), (28, 2), (29, 2)]), contexto(p, permitir_todo=False))
    assert 1 in reglas(errores)


def test_lumbar_sin_movilidad_activa_regla_5_por_dia():
    p = perfil(condiciones=("DOLOR_LUMBAR",), dias=2)
    # Día 1 tiene Gato-camello (movilidad apta para lumbar); el día 2 no tiene movilidad ni estiramiento
    r = rutina([(23, 1), (28, 2), (29, 2)], [(23, 1), (3, 3), (17, 3)])
    errores = ValidadorSeguridad().validar(r, contexto(p))
    assert any(e.startswith("Regla 5: el día 2") for e in errores)
    assert not any(e.startswith("Regla 5: el día 1") for e in errores)


@pytest.mark.parametrize("nivel", ["SEDENTARIO", "LIGERO"])
def test_principiante_con_avanzado_o_5_series_activa_regla_4(nivel):
    p = perfil(nivel=nivel)
    errores = ValidadorSeguridad().validar(rutina([(5, 3), (3, 5), (29, 2)]), contexto(p))
    r4 = [e for e in errores if e.startswith("Regla 4")]
    assert any("AVANZADO" in e for e in r4)
    assert any("5 series" in e for e in r4)


def test_usuario_activo_puede_hacer_avanzado():
    errores = ValidadorSeguridad().validar(rutina([(5, 5), (29, 2)]), contexto(perfil(nivel="ACTIVO")))
    assert 4 not in reglas(errores)


@pytest.mark.parametrize("condicion", ["OBESIDAD", "DOLOR_RODILLA"])
def test_impacto_alto_con_obesidad_o_rodilla_activa_regla_6(condicion):
    p = perfil(condiciones=(condicion,))
    errores = ValidadorSeguridad().validar(rutina([(25, 1), (3, 3), (29, 2)]), contexto(p))
    assert any(e.startswith("Regla 6") and "ejercicio 25" in e for e in errores)


def test_dias_y_duracion_activan_regla_3():
    p = perfil(dias=3, minutos=10)
    errores = ValidadorSeguridad().validar(rutina([(3, 4), (11, 4), (17, 4), (29, 2)]), contexto(p))
    textos = [e for e in errores if e.startswith("Regla 3")]
    assert any("días" in e for e in textos)
    assert any("dura" in e for e in textos)


def test_dia_que_no_termina_en_estiramiento_activa_regla_7():
    errores = ValidadorSeguridad().validar(rutina([(23, 1), (29, 2), (3, 3)]), contexto(perfil()))
    assert 7 in reglas(errores)


@pytest.mark.parametrize("p", [
    perfil(nivel="SEDENTARIO", condiciones=("SOBREPESO", "DOLOR_LUMBAR"), dias=3, minutos=45, objetivo="BAJAR_PESO"),
    perfil(nivel="LIGERO", condiciones=("BAJO_PESO",), dias=4, minutos=60, objetivo="GANAR_MASA"),
    perfil(nivel="SEDENTARIO", condiciones=("OBESIDAD", "DOLOR_RODILLA"), dias=5, minutos=20, objetivo="SALUD_GENERAL"),
    perfil(nivel="MUY_ACTIVO", condiciones=(), dias=7, minutos=90, objetivo="TONIFICAR"),
    perfil(nivel="MODERADO", condiciones=("DOLOR_LUMBAR",), dias=2, minutos=10, objetivo="ALIVIAR_LUMBAR"),
])
def test_mock_siempre_produce_rutina_valida(p):
    ctx = contexto(p, permitir_todo=False)
    resultado = MockProvider().generar(p, list(ctx.catalogo.values()))
    assert ValidadorSeguridad().validar(resultado.rutina, ctx) == []


def test_perfil_anonimo_no_tiene_datos_personales():
    campos = set(PerfilAnonimo.model_fields)
    assert not campos & {"nombre", "nombres", "apellidos", "email", "correo", "telefono"}
