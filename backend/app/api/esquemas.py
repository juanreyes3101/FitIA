"""Modelos pydantic de entrada (validación de todo lo que llega a la API)."""
from datetime import date
from typing import Literal

from flask import request
from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.errors import ApiError


class Entrada(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


def cuerpo(modelo: type[BaseModel]):
    datos = request.get_json(silent=True)
    if not isinstance(datos, dict):
        raise ApiError("DATOS_INVALIDOS", "Envía el cuerpo en formato JSON.", 400)
    return modelo.model_validate(datos)


# ---------- auth ----------
class Registro(Entrada):
    nombres: str = Field(min_length=1, max_length=80)
    apellidos: str = Field(min_length=1, max_length=80)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    telefono: str | None = Field(default=None, max_length=20)
    fecha_nacimiento: date | None = None
    sexo: Literal["F", "M", "O", "N"] = "N"
    acepta_terminos: bool


class Login(Entrada):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


# ---------- perfil ----------
NivelActividad = Literal["SEDENTARIO", "LIGERO", "MODERADO", "ACTIVO", "MUY_ACTIVO"]
Objetivo = Literal["BAJAR_PESO", "GANAR_MASA", "TONIFICAR", "SALUD_GENERAL", "ALIVIAR_LUMBAR"]


class CondicionEntrada(Entrada):
    codigo: str = Field(max_length=30)
    severidad: int = Field(default=1, ge=1, le=3)


class PerfilEntrada(Entrada):
    nivel_actividad: NivelActividad
    objetivo: Objetivo
    dias_disponibles: int = Field(ge=1, le=7)
    minutos_por_sesion: int = Field(ge=10, le=180)
    lugar_entreno: Literal["GIMNASIO", "CASA", "PARQUE"] = "GIMNASIO"
    observaciones: str | None = Field(default=None, max_length=500)
    condiciones: list[CondicionEntrada] | None = None  # solo AUTORREPORTE (lumbar, rodilla, hipertensión)
    # Datos de la cuenta que pide el onboarding (se guardan en `usuarios`, no en perfiles_salud)
    fecha_nacimiento: date | None = None
    sexo: Literal["F", "M", "O", "N"] | None = None


class MedicionEntrada(Entrada):
    peso_kg: float = Field(ge=20, le=350)
    estatura_cm: float = Field(ge=100, le=250)
    cintura_cm: float | None = Field(default=None, ge=30, le=250)


# ---------- sesiones ----------
class SesionEjercicioEntrada(Entrada):
    ejercicio_id: int = Field(ge=1)
    series_hechas: int = Field(ge=0, le=20)
    reps_hechas: int | None = Field(default=None, ge=0, le=200)
    peso_kg: float | None = Field(default=None, ge=0, le=500)


class SesionEntrada(Entrada):
    rutina_dia_id: int | None = Field(default=None, ge=1)
    duracion_min: int | None = Field(default=None, ge=1, le=600)
    esfuerzo_percibido: int = Field(ge=1, le=10)
    dolor_reportado: int = Field(default=0, ge=0, le=10)
    completada: bool = True
    notas: str | None = Field(default=None, max_length=255)
    ejercicios: list[SesionEjercicioEntrada] = Field(default_factory=list)


# ---------- pagos ----------
class PagoEntrada(Entrada):
    plan_codigo: str = Field(max_length=20)
    metodo: Literal["TARJETA", "PSE", "NEQUI"]
    numero_tarjeta: str | None = Field(default=None, max_length=25, repr=False)  # nunca se guarda ni se loguea


# ---------- entrenador ----------
class AjusteEjercicio(Entrada):
    rutina_ejercicio_id: int = Field(ge=1)
    series: int | None = Field(default=None, ge=1, le=10)
    repeticiones: int | None = Field(default=None, ge=1, le=100)
    duracion_seg: int | None = Field(default=None, ge=5, le=3600)
    descanso_seg: int | None = Field(default=None, ge=0, le=600)
    notas: str | None = Field(default=None, max_length=255)


class RevisionRutina(Entrada):
    accion: Literal["APROBAR", "RECHAZAR", "AJUSTAR"]
    observaciones: str | None = Field(default=None, max_length=500)
    ajustes: list[AjusteEjercicio] | None = None


# ---------- admin ----------
class UsuarioAdminCrear(Entrada):
    nombres: str = Field(min_length=1, max_length=80)
    apellidos: str = Field(min_length=1, max_length=80)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    rol: Literal["USUARIO", "ENTRENADOR", "ADMIN"] = "USUARIO"
    telefono: str | None = Field(default=None, max_length=20)


class UsuarioAdminEditar(Entrada):
    nombres: str | None = Field(default=None, min_length=1, max_length=80)
    apellidos: str | None = Field(default=None, min_length=1, max_length=80)
    telefono: str | None = Field(default=None, max_length=20)
    rol: Literal["USUARIO", "ENTRENADOR", "ADMIN"] | None = None
    estado: Literal["ACTIVO", "INACTIVO", "BLOQUEADO"] | None = None


class EjercicioAdmin(Entrada):
    nombre: str = Field(min_length=1, max_length=100)
    tipo: Literal["FUERZA", "CARDIO", "ESTIRAMIENTO", "MOVILIDAD", "CORE"]
    grupo_muscular_id: int = Field(ge=1)
    equipamiento_id: int = Field(ge=1)
    dificultad: Literal["PRINCIPIANTE", "INTERMEDIO", "AVANZADO"]
    impacto: Literal["BAJO", "MEDIO", "ALTO"]
    apto_lumbar: bool = False
    instrucciones: str | None = None
    imagen_url: str | None = Field(default=None, max_length=255)
    video_url: str | None = Field(default=None, max_length=255)


class ContraindicacionAdmin(Entrada):
    ejercicio_id: int = Field(ge=1)
    condicion_id: int = Field(ge=1)
    motivo: str = Field(min_length=1, max_length=255)


class PlanAdmin(Entrada):
    codigo: str = Field(min_length=1, max_length=20)
    nombre: str = Field(min_length=1, max_length=50)
    precio_cop: float = Field(ge=0)
    duracion_dias: int | None = Field(default=None, ge=1)
    con_publicidad: bool = True
    rutinas_ia_mes: int = Field(ge=0, le=255)
    activo: bool = True


class AnuncioAdmin(Entrada):
    anunciante: str = Field(min_length=1, max_length=80)
    titulo: str = Field(min_length=1, max_length=100)
    imagen_url: str | None = Field(default=None, max_length=255)
    destino_url: str | None = Field(default=None, max_length=255)
    ubicacion: Literal["BANNER_HOME", "ENTRE_EJERCICIOS", "FIN_SESION"]
    activo: bool = True


class SimularPico(Entrada):
    servicio: str = Field(default="api", max_length=30)
    metrica: Literal["LATENCIA_MS", "TASA_ERROR", "RPS", "CPU_PCT", "MEM_PCT"] = "LATENCIA_MS"
    minutos: int = Field(default=30, ge=5, le=120)
    factor: float = Field(default=4.0, ge=1.5, le=20)


# ---------- query string ----------
def param_num(nombre: str, tipo=int, defecto=None, minimo=None, maximo=None, obligatorio=False):
    crudo = request.args.get(nombre)
    if crudo in (None, ""):
        if obligatorio:
            raise ApiError("DATOS_INVALIDOS", f"Falta el parámetro '{nombre}'.", 400)
        return defecto
    try:
        valor = tipo(crudo)
    except ValueError:
        raise ApiError("DATOS_INVALIDOS", f"El parámetro '{nombre}' debe ser numérico.", 400) from None
    if (minimo is not None and valor < minimo) or (maximo is not None and valor > maximo):
        raise ApiError("DATOS_INVALIDOS", f"El parámetro '{nombre}' debe estar entre {minimo} y {maximo}.", 400)
    return valor


def param_bool(nombre: str):
    crudo = request.args.get(nombre)
    if crudo in (None, ""):
        return None
    if crudo.lower() in ("1", "true", "si", "sí"):
        return True
    if crudo.lower() in ("0", "false", "no"):
        return False
    raise ApiError("DATOS_INVALIDOS", f"El parámetro '{nombre}' debe ser true o false.", 400)
