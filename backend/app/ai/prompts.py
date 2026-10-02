"""Prompts para el modelo. Solo llevan el perfil ANÓNIMO y el catálogo permitido."""
import json

from app.ai.schema import EjercicioCatalogo, PerfilAnonimo

SISTEMA = """Eres un entrenador personal certificado que diseña rutinas SEGURAS para gimnasios
de barrio en Colombia. Respondes SOLO con JSON válido, sin texto adicional ni markdown."""

ESQUEMA = """{
  "nombre": "string (máx. 100 caracteres)",
  "semanas": 4,
  "dias": [
    {"dia_numero": 1, "enfoque": "string (máx. 60)",
     "ejercicios": [
       {"ejercicio_id": 22, "orden": 1, "series": 1, "repeticiones": null,
        "duracion_seg": 1200, "descanso_seg": 60, "notas": "string"}]}],
  "explicacion": "por qué esta rutina para este perfil (máx. 3 frases, en español, tuteando)"
}"""

REGLAS = """REGLAS OBLIGATORIAS:
1. Usa SOLO ejercicio_id de la lista de ejercicios permitidos.
2. No inventes ejercicios ni ids.
3. Exactamente {dias} días (dia_numero 1..{dias}); cada día debe durar como máximo {minutos} minutos
   (estimación: series × (duracion_seg o repeticiones×4 s) + series × descanso_seg).
4. {principiante}
5. {lumbar}
6. {impacto}
7. El ÚLTIMO ejercicio de cada día (mayor "orden") debe ser de tipo ESTIRAMIENTO.
Cada ejercicio lleva "repeticiones" o "duracion_seg" (al menos uno). "orden" empieza en 1 y no se repite en el día."""


def construir_prompt(perfil: PerfilAnonimo, catalogo: list[EjercicioCatalogo],
                     errores_previos: list[str] | None = None) -> str:
    condiciones = {c.codigo for c in perfil.condiciones}
    principiante = perfil.nivel_actividad in ("SEDENTARIO", "LIGERO")
    reglas = REGLAS.format(
        dias=perfil.dias_disponibles,
        minutos=perfil.minutos_por_sesion,
        principiante=("El usuario es principiante: nada de dificultad AVANZADO y máximo 4 series por ejercicio."
                      if principiante else "Ajusta la dificultad al nivel de actividad."),
        lumbar=("Tiene DOLOR_LUMBAR: cada día incluye al menos un ejercicio con apto_lumbar=true de tipo "
                "MOVILIDAD o ESTIRAMIENTO." if "DOLOR_LUMBAR" in condiciones else "Sin restricción lumbar."),
        impacto=("Tiene OBESIDAD o DOLOR_RODILLA: ningún ejercicio de impacto ALTO."
                 if condiciones & {"OBESIDAD", "DOLOR_RODILLA"} else "Prefiere impacto bajo o medio."),
    )
    lista = [e.model_dump(exclude={"grupo", "equipo"}) | {"grupo": e.grupo} for e in catalogo]
    partes = [
        "PERFIL (anónimo):", json.dumps(perfil.model_dump(), ensure_ascii=False),
        "EJERCICIOS PERMITIDOS:", json.dumps(lista, ensure_ascii=False),
        reglas,
        "Devuelve un JSON con exactamente este esquema:", ESQUEMA,
    ]
    if errores_previos:
        partes += ["Tu respuesta anterior fue RECHAZADA por el validador de seguridad por estos motivos. "
                   "Corrígelos todos:", "\n".join(f"- {e}" for e in errores_previos)]
    return "\n\n".join(partes)
