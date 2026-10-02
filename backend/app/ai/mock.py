"""MockProvider: rutina base segura armada por reglas, sin internet ni costo.
Se usa en desarrollo, en las pruebas y como respaldo cuando Gemini falla."""
import time

from app.ai.base import AdaptadorIA, ErrorProveedorIA, ResultadoIA
from app.ai.schema import DiaRutinaIA, EjercicioCatalogo, EjercicioRutinaIA, PerfilAnonimo, RutinaIA
from app.services.validador import NIVELES_PRINCIPIANTE, duracion_estimada_seg

ENFOQUES = {
    "BAJAR_PESO": "Cardio suave y fuerza",
    "GANAR_MASA": "Fuerza progresiva",
    "TONIFICAR": "Fuerza y core",
    "SALUD_GENERAL": "Cuerpo completo",
    "ALIVIAR_LUMBAR": "Core y espalda sana",
}
NOMBRES = {
    "BAJAR_PESO": "Plan quema segura",
    "GANAR_MASA": "Plan fuerza base",
    "TONIFICAR": "Plan tono y control",
    "SALUD_GENERAL": "Plan bienestar",
    "ALIVIAR_LUMBAR": "Plan espalda fuerte",
}


class MockProvider(AdaptadorIA):
    nombre = "mock"
    modelo = "reglas-v1"

    def generar(self, perfil: PerfilAnonimo, catalogo: list[EjercicioCatalogo],
                errores_previos: list[str] | None = None) -> ResultadoIA:
        t0 = time.perf_counter()
        condiciones = {c.codigo for c in perfil.condiciones}
        principiante = perfil.nivel_actividad in NIVELES_PRINCIPIANTE
        lumbar = "DOLOR_LUMBAR" in condiciones
        sin_alto = bool(condiciones & {"OBESIDAD", "DOLOR_RODILLA"})

        def apto(e: EjercicioCatalogo) -> bool:
            if e.impacto == "ALTO" and (sin_alto or principiante):
                return False
            if e.dificultad == "AVANZADO" and principiante:
                return False
            return True

        seguros = [e for e in catalogo if apto(e)]
        cardio = sorted((e for e in seguros if e.tipo == "CARDIO" and e.impacto == "BAJO"),
                        key=lambda e: (not e.apto_lumbar, e.id))
        estiramientos = sorted((e for e in seguros if e.tipo == "ESTIRAMIENTO"),
                               key=lambda e: (not e.apto_lumbar, e.id))
        movilidad = sorted((e for e in seguros if e.tipo == "MOVILIDAD" and e.apto_lumbar), key=lambda e: e.id)
        principal = self._pool_principal(seguros, perfil.objetivo, principiante, lumbar)
        if not estiramientos:
            raise ErrorProveedorIA("El catálogo permitido no tiene estiramientos para cerrar la rutina.")

        limite = perfil.minutos_por_sesion * 60
        series = 3 if not principiante else 2 if perfil.minutos_por_sesion < 30 else 3
        dias = []
        for i in range(perfil.dias_disponibles):
            items: list[EjercicioRutinaIA] = []

            def agregar(ej: EjercicioCatalogo, **kw):
                items.append(EjercicioRutinaIA(ejercicio_id=ej.id, orden=len(items) + 1, **kw))

            if cardio:
                agregar(cardio[i % len(cardio)], series=1, duracion_seg=max(120, int(limite * 0.25) // 60 * 60),
                        descanso_seg=60, notas="Calentamiento a ritmo cómodo: puedes hablar sin ahogarte.")
            cola: list[tuple[EjercicioCatalogo, dict]] = []
            if lumbar and movilidad:
                cola.append((movilidad[i % len(movilidad)],
                             dict(series=2, repeticiones=10, descanso_seg=30, notas="Movimiento lento y sin dolor.")))
            cola.append((estiramientos[i % len(estiramientos)],
                         dict(series=2, duracion_seg=30, descanso_seg=15, notas="Respira profundo, sin rebotes.")))
            reserva = sum(duracion_estimada_seg(EjercicioRutinaIA(ejercicio_id=e.id, orden=1, **kw)) for e, kw in cola)
            usado = sum(duracion_estimada_seg(x) for x in items)

            for k in range(min(4, len(principal))):
                ej = principal[(i * 3 + k) % len(principal)]
                kw = dict(series=series, repeticiones=12, descanso_seg=60)
                if ej.tipo == "CORE" and ej.nombre.lower().startswith("plancha"):
                    kw = dict(series=series, duracion_seg=30, descanso_seg=45)
                costo = duracion_estimada_seg(EjercicioRutinaIA(ejercicio_id=ej.id, orden=1, **kw))
                if any(x.ejercicio_id == ej.id for x in items) or usado + costo + reserva > limite:
                    continue
                agregar(ej, **kw)
                usado += costo
            for ej, kw in cola:
                agregar(ej, **kw)
            dias.append(DiaRutinaIA(dia_numero=i + 1, enfoque=ENFOQUES.get(perfil.objetivo, "Cuerpo completo"),
                                    ejercicios=items))

        explicacion = "Rutina base armada por reglas de seguridad: calentamiento suave, trabajo principal " \
                      "con volumen moderado y cierre con estiramiento."
        if lumbar:
            explicacion += " Incluye movilidad lumbar todos los días por tu molestia de espalda."
        rutina = RutinaIA(nombre=NOMBRES.get(perfil.objetivo, "Plan FitIA"), semanas=4, dias=dias,
                          explicacion=explicacion)
        return ResultadoIA(rutina=rutina, proveedor=self.nombre, modelo=self.modelo,
                           latencia_ms=int((time.perf_counter() - t0) * 1000))

    @staticmethod
    def _pool_principal(seguros, objetivo, principiante, lumbar):
        tipos = {"GANAR_MASA": ("FUERZA",), "ALIVIAR_LUMBAR": ("CORE", "FUERZA")}.get(objetivo, ("FUERZA", "CORE"))
        pool = [e for e in seguros if e.tipo in tipos]
        if objetivo == "ALIVIAR_LUMBAR" or lumbar:
            pool.sort(key=lambda e: (not e.apto_lumbar, e.dificultad != "PRINCIPIANTE", e.impacto != "BAJO", e.id))
        else:
            pool.sort(key=lambda e: (principiante and e.dificultad != "PRINCIPIANTE", e.impacto == "ALTO", e.id))
        return pool
