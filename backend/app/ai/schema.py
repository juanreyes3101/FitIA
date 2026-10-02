"""Contratos de entrada/salida del modelo de IA (sección 5 de la arquitectura)."""
from pydantic import BaseModel, Field, model_validator


class CondicionAnonima(BaseModel):
    codigo: str
    severidad: int = Field(ge=1, le=3)


class PerfilAnonimo(BaseModel):
    """Lo ÚNICO que se envía al modelo: nunca nombre, correo ni teléfono."""
    edad: int | None
    imc: float | None
    clasificacion_imc: str | None
    nivel_actividad: str
    objetivo: str
    condiciones: list[CondicionAnonima]
    dias_disponibles: int = Field(ge=1, le=7)
    minutos_por_sesion: int = Field(ge=10, le=180)
    lugar_entreno: str


class EjercicioCatalogo(BaseModel):
    """Fila de sp_ejercicios_seguros (catálogo permitido)."""
    id: int
    nombre: str
    tipo: str
    grupo: str | None = None
    equipo: str | None = None
    dificultad: str
    impacto: str
    apto_lumbar: bool


class EjercicioRutinaIA(BaseModel):
    ejercicio_id: int
    orden: int = Field(ge=1, le=30)
    series: int = Field(ge=1, le=10)
    repeticiones: int | None = Field(default=None, ge=1, le=100)
    duracion_seg: int | None = Field(default=None, ge=5, le=3600)
    descanso_seg: int = Field(default=60, ge=0, le=600)
    notas: str | None = Field(default=None, max_length=255)

    @model_validator(mode="after")
    def _volumen(self):
        if self.repeticiones is None and self.duracion_seg is None:
            raise ValueError("cada ejercicio necesita repeticiones o duracion_seg")
        return self


class DiaRutinaIA(BaseModel):
    dia_numero: int = Field(ge=1, le=7)
    enfoque: str = Field(min_length=1, max_length=60)
    ejercicios: list[EjercicioRutinaIA] = Field(min_length=1)


class RutinaIA(BaseModel):
    nombre: str = Field(min_length=1, max_length=100)
    semanas: int = Field(default=4, ge=1, le=12)
    dias: list[DiaRutinaIA] = Field(min_length=1, max_length=7)
    explicacion: str = Field(min_length=1, max_length=600)
