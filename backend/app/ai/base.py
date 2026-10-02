"""Patrón Strategy: cualquier proveedor de IA implementa AdaptadorIA."""
from abc import ABC, abstractmethod
from dataclasses import dataclass

from app.ai.schema import EjercicioCatalogo, PerfilAnonimo, RutinaIA


@dataclass
class ResultadoIA:
    rutina: RutinaIA
    proveedor: str
    modelo: str
    latencia_ms: int
    tokens_entrada: int | None = None
    tokens_salida: int | None = None


class ErrorProveedorIA(Exception):
    """Fallo del proveedor. `abre_breaker_ya` = cuota agotada (429) o modelo inexistente."""
    def __init__(self, mensaje: str, abre_breaker_ya: bool = False):
        super().__init__(mensaje)
        self.abre_breaker_ya = abre_breaker_ya


class AdaptadorIA(ABC):
    nombre: str

    @abstractmethod
    def generar(self, perfil: PerfilAnonimo, catalogo: list[EjercicioCatalogo],
                errores_previos: list[str] | None = None) -> ResultadoIA:
        """Devuelve una rutina que cumple el esquema RutinaIA o lanza ErrorProveedorIA."""
