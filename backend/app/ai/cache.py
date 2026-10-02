"""Caché de rutinas 24 h por perfil + catálogo (en memoria de proceso)."""
import hashlib
import json
import threading
import time

from app.ai.schema import EjercicioCatalogo, PerfilAnonimo


def clave_cache(usuario_id: int, perfil: PerfilAnonimo, catalogo: list[EjercicioCatalogo]) -> str:
    contenido = json.dumps({"u": usuario_id, "perfil": perfil.model_dump(),
                            "catalogo": sorted(e.id for e in catalogo)}, sort_keys=True)
    return hashlib.sha256(contenido.encode()).hexdigest()


class CacheTTL:
    def __init__(self, ttl_seg: int = 24 * 3600, reloj=time.monotonic):
        self.ttl_seg = ttl_seg
        self._reloj = reloj
        self._datos: dict[str, tuple[float, object]] = {}
        self._lock = threading.Lock()

    def obtener(self, clave: str):
        with self._lock:
            item = self._datos.get(clave)
            if not item:
                return None
            vence, valor = item
            if self._reloj() >= vence:
                del self._datos[clave]
                return None
            return valor

    def guardar(self, clave: str, valor) -> None:
        with self._lock:
            self._datos[clave] = (self._reloj() + self.ttl_seg, valor)

    def limpiar(self) -> None:
        with self._lock:
            self._datos.clear()
