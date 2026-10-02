"""Rate-limit en memoria de proceso (ventana deslizante). Sin Redis: despliegue de un solo proceso."""
import threading
import time
from collections import defaultdict, deque
from functools import wraps

from flask import current_app, request

from app.errors import ApiError


class LimitadorMemoria:
    def __init__(self):
        self._eventos: dict[str, deque] = defaultdict(deque)
        self._lock = threading.Lock()

    def permitir(self, clave: str, maximo: int, ventana_seg: int) -> bool:
        ahora = time.monotonic()
        with self._lock:
            cola = self._eventos[clave]
            while cola and ahora - cola[0] > ventana_seg:
                cola.popleft()
            if len(cola) >= maximo:
                return False
            cola.append(ahora)
            return True


def limitar(nombre: str, maximo: int, ventana_seg: int = 60, por_usuario: bool = False):
    def decorador(fn):
        @wraps(fn)
        def envoltura(*args, **kwargs):
            if current_app.config.get("RATE_LIMIT_ACTIVO", True):
                if por_usuario:
                    from flask_jwt_extended import get_jwt_identity
                    sujeto = f"u{get_jwt_identity()}"
                else:
                    sujeto = request.remote_addr or "anon"
                limitador: LimitadorMemoria = current_app.extensions["fitia_limitador"]
                if not limitador.permitir(f"{nombre}:{sujeto}", maximo, ventana_seg):
                    raise ApiError("DEMASIADAS_SOLICITUDES",
                                   "Hiciste demasiadas solicitudes. Espera un minuto e intenta de nuevo.", 429)
            return fn(*args, **kwargs)
        return envoltura
    return decorador
