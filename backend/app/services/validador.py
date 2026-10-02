"""ValidadorSeguridad — 2.ª capa de la defensa en profundidad (la 1.ª es el catálogo de
sp_ejercicios_seguros y la 3.ª el trigger trg_rutina_ejercicio_seguro).

Cadena de responsabilidad: cada regla es una clase que revisa la rutina y devuelve su
lista de errores. Es código PURO: recibe un ContextoValidacion ya armado y nunca toca
la BD, así las 7 reglas se prueban sin MySQL.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field

from app.ai.schema import EjercicioCatalogo, EjercicioRutinaIA, PerfilAnonimo, RutinaIA

# No hay columna de "experiencia": se considera principiante a quien hoy es sedentario o ligero.
NIVELES_PRINCIPIANTE = {"SEDENTARIO", "LIGERO"}
MAX_SERIES_PRINCIPIANTE = 4
SEG_POR_REPETICION = 4
TOLERANCIA_DURACION = 1.10


@dataclass
class ContextoValidacion:
    perfil: PerfilAnonimo
    catalogo: dict[int, EjercicioCatalogo]          # permitidos (sp_ejercicios_seguros)
    contraindicaciones: dict[int, set[str]] = field(default_factory=dict)  # ejercicio_id -> {condición}
    ejercicios_existentes: set[int] | None = None     # todos los ids de `ejercicios` (None = no se sabe)

    @property
    def condiciones(self) -> set[str]:
        return {c.codigo for c in self.perfil.condiciones}

    @property
    def es_principiante(self) -> bool:
        return self.perfil.nivel_actividad in NIVELES_PRINCIPIANTE


def duracion_estimada_seg(ej: EjercicioRutinaIA) -> int:
    trabajo = ej.duracion_seg if ej.duracion_seg else (ej.repeticiones or 0) * SEG_POR_REPETICION
    return ej.series * (trabajo + ej.descanso_seg)


class Regla(ABC):
    numero: int

    @abstractmethod
    def revisar(self, rutina: RutinaIA, ctx: ContextoValidacion) -> list[str]: ...


class R1CatalogoPermitido(Regla):
    numero = 1

    def revisar(self, rutina, ctx):
        errores = []
        for dia in rutina.dias:
            for ej in dia.ejercicios:
                if ctx.ejercicios_existentes is not None and ej.ejercicio_id not in ctx.ejercicios_existentes:
                    errores.append(f"Regla 1: el ejercicio {ej.ejercicio_id} (día {dia.dia_numero}) no existe.")
                elif ej.ejercicio_id not in ctx.catalogo:
                    errores.append(f"Regla 1: el ejercicio {ej.ejercicio_id} (día {dia.dia_numero}) "
                                   "no está en el catálogo permitido para este perfil.")
        return errores


class R2SinContraindicados(Regla):
    numero = 2

    def revisar(self, rutina, ctx):
        errores = []
        for dia in rutina.dias:
            for ej in dia.ejercicios:
                choques = ctx.contraindicaciones.get(ej.ejercicio_id, set()) & ctx.condiciones
                if choques:
                    errores.append(f"Regla 2: el ejercicio {ej.ejercicio_id} (día {dia.dia_numero}) está "
                                   f"contraindicado para {', '.join(sorted(choques))}.")
        return errores


class R3DiasYDuracion(Regla):
    numero = 3

    def revisar(self, rutina, ctx):
        errores = []
        esperados = ctx.perfil.dias_disponibles
        if len(rutina.dias) != esperados:
            errores.append(f"Regla 3: la rutina tiene {len(rutina.dias)} días y el usuario dispone de {esperados}.")
        numeros = [d.dia_numero for d in rutina.dias]
        if len(set(numeros)) != len(numeros):
            errores.append("Regla 3: hay números de día repetidos.")
        limite = ctx.perfil.minutos_por_sesion * 60 * TOLERANCIA_DURACION
        for dia in rutina.dias:
            ordenes = [e.orden for e in dia.ejercicios]
            if len(set(ordenes)) != len(ordenes):
                errores.append(f"Regla 3: el día {dia.dia_numero} repite números de orden.")
            total = sum(duracion_estimada_seg(e) for e in dia.ejercicios)
            if total > limite:
                errores.append(f"Regla 3: el día {dia.dia_numero} dura ~{round(total / 60)} min y el máximo es "
                               f"{ctx.perfil.minutos_por_sesion} min (+10 %).")
        return errores


class R4Principiante(Regla):
    numero = 4

    def revisar(self, rutina, ctx):
        if not ctx.es_principiante:
            return []
        errores = []
        for dia in rutina.dias:
            for ej in dia.ejercicios:
                info = ctx.catalogo.get(ej.ejercicio_id)
                if info and info.dificultad == "AVANZADO":
                    errores.append(f"Regla 4: el ejercicio {ej.ejercicio_id} (día {dia.dia_numero}) es AVANZADO "
                                   "y el usuario es principiante.")
                if ej.series > MAX_SERIES_PRINCIPIANTE:
                    errores.append(f"Regla 4: el ejercicio {ej.ejercicio_id} (día {dia.dia_numero}) tiene "
                                   f"{ej.series} series; el máximo para principiante es {MAX_SERIES_PRINCIPIANTE}.")
        return errores


class R5Lumbar(Regla):
    numero = 5

    def revisar(self, rutina, ctx):
        if "DOLOR_LUMBAR" not in ctx.condiciones:
            return []
        errores = []
        for dia in rutina.dias:
            ok = any((info := ctx.catalogo.get(e.ejercicio_id)) and info.apto_lumbar
                     and info.tipo in ("MOVILIDAD", "ESTIRAMIENTO") for e in dia.ejercicios)
            if not ok:
                errores.append(f"Regla 5: el día {dia.dia_numero} necesita al menos un ejercicio apto para "
                               "zona lumbar de MOVILIDAD o ESTIRAMIENTO.")
        return errores


class R6SinImpactoAlto(Regla):
    numero = 6

    def revisar(self, rutina, ctx):
        afectan = ctx.condiciones & {"OBESIDAD", "DOLOR_RODILLA"}
        if not afectan:
            return []
        errores = []
        for dia in rutina.dias:
            for ej in dia.ejercicios:
                info = ctx.catalogo.get(ej.ejercicio_id)
                if info and info.impacto == "ALTO":
                    errores.append(f"Regla 6: el ejercicio {ej.ejercicio_id} (día {dia.dia_numero}) es de impacto "
                                   f"ALTO, no permitido con {', '.join(sorted(afectan))}.")
        return errores


class R7TerminaConEstiramiento(Regla):
    numero = 7

    def revisar(self, rutina, ctx):
        errores = []
        for dia in rutina.dias:
            ultimo = max(dia.ejercicios, key=lambda e: e.orden)
            info = ctx.catalogo.get(ultimo.ejercicio_id)
            if not info or info.tipo != "ESTIRAMIENTO":
                errores.append(f"Regla 7: el día {dia.dia_numero} debe terminar con un estiramiento.")
        return errores


class ValidadorSeguridad:
    def __init__(self, reglas: list[Regla] | None = None):
        self.reglas = reglas or [R1CatalogoPermitido(), R2SinContraindicados(), R3DiasYDuracion(),
                                 R4Principiante(), R5Lumbar(), R6SinImpactoAlto(), R7TerminaConEstiramiento()]

    def validar(self, rutina: RutinaIA, ctx: ContextoValidacion) -> list[str]:
        errores: list[str] = []
        for regla in self.reglas:
            errores.extend(regla.revisar(rutina, ctx))
        return errores
