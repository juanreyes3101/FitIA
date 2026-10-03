"""Tráfico sintético para la demo "Simular pico" (NumPy: ruido normal + un pico).

El pico ocupa solo el último intervalo del worker, así la línea base del ciclo queda limpia.
Si la métrica ya tiene historia real suficiente, el pico se calcula sobre esa base y no se inventa historia.
"""
from datetime import datetime, timedelta

import numpy as np

from app.monitoring.analisis import LineaBase

BASE = {"LATENCIA_MS": (120.0, 15.0), "RPS": (8.0, 1.5), "TASA_ERROR": (0.01, 0.005),
        "CPU_PCT": (35.0, 5.0), "MEM_PCT": (55.0, 4.0)}
PASO_SEG = 10
MIN_HISTORIA_REAL = 30


def muestras_pico(intervalo_seg: int, reales_en_intervalo: int = 0) -> int:
    """Un pico de tráfico de verdad trae MÁS peticiones lentas que el tráfico normal: si no, la media del
    intervalo (lo que mira el detector) se diluye con las peticiones rápidas de la propia consola."""
    return max(2, intervalo_seg // PASO_SEG, 3 * reales_en_intervalo)


def _recortar(valores: np.ndarray, metrica: str) -> np.ndarray:
    if metrica == "TASA_ERROR":
        return np.clip(valores, 0, 1)
    return np.clip(valores, 0, 100 if metrica.endswith("_PCT") else None)


def generar_pico(servicio_id: int, metrica: str, minutos: int = 30, factor: float = 4.0,
                 semilla: int | None = None, n_pico: int = 12, base_real: LineaBase | None = None,
                 ahora: datetime | None = None, intervalo_seg: int = 60) -> list[dict]:
    """Con `base_real` solo se generan las `n_pico` muestras del pico, repartidas en el último intervalo.
    Si no, una muestra cada 10 s: `minutos` de historia normal y las últimas `n_pico` llevan el pico (× factor)."""
    rng = np.random.default_rng(semilla)
    ahora = ahora or datetime.now()
    if base_real is not None:
        media, sigma = base_real.media, base_real.desviacion
        objetivo = max(media * factor, media + 8 * sigma)
        valores = _recortar(rng.normal(objetivo, sigma / 2, n_pico), metrica)
        paso = (intervalo_seg - 1) / n_pico
        return [{"servicio_id": servicio_id, "metrica": metrica, "valor": round(float(v), 4),
                 "registrado_en": ahora - timedelta(seconds=paso * (n_pico - 1 - i))} for i, v in enumerate(valores)]
    else:
        media, sigma = BASE[metrica]
        n = minutos * 6
        valores = rng.normal(media, sigma, n)
        pico = min(n_pico, n)
        valores[-pico:] = rng.normal(media * factor, sigma * factor, pico)
    valores = _recortar(valores, metrica)
    n = len(valores)
    return [{"servicio_id": servicio_id, "metrica": metrica, "valor": round(float(v), 4),
             "registrado_en": ahora - timedelta(seconds=PASO_SEG * (n - 1 - i))} for i, v in enumerate(valores)]
