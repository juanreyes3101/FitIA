"""Circuit Breaker: 3 fallos seguidos (o un 429 de cuota) → Mock durante 5 minutos."""
import threading
import time

CERRADO, ABIERTO, SEMIABIERTO = "CERRADO", "ABIERTO", "SEMIABIERTO"


class CircuitBreaker:
    def __init__(self, max_fallos: int = 3, enfriamiento_seg: int = 300, reloj=time.monotonic):
        self.max_fallos = max_fallos
        self.enfriamiento_seg = enfriamiento_seg
        self._reloj = reloj
        self._fallos = 0
        self._abierto_hasta = 0.0
        self._lock = threading.Lock()

    @property
    def estado(self) -> str:
        with self._lock:
            if self._abierto_hasta == 0:
                return CERRADO
            return ABIERTO if self._reloj() < self._abierto_hasta else SEMIABIERTO

    def permite(self) -> bool:
        return self.estado != ABIERTO

    def registrar_exito(self) -> None:
        with self._lock:
            self._fallos = 0
            self._abierto_hasta = 0.0

    def registrar_fallo(self, abrir_ya: bool = False) -> None:
        with self._lock:
            self._fallos += 1
            semiabierto = self._abierto_hasta and self._reloj() >= self._abierto_hasta
            if abrir_ya or semiabierto or self._fallos >= self.max_fallos:
                self._abierto_hasta = self._reloj() + self.enfriamiento_seg
                self._fallos = 0
