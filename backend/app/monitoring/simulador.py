"""Tráfico sintético para la demo "Simular pico" (NumPy: ruido normal + un pico).
Solo escribe en `metricas`; no dispara detección de anomalías (eso es la Etapa 6)."""
from datetime import datetime, timedelta

import numpy as np

BASE = {"LATENCIA_MS": (120.0, 15.0), "RPS": (8.0, 1.5), "TASA_ERROR": (0.01, 0.005),
        "CPU_PCT": (35.0, 5.0), "MEM_PCT": (55.0, 4.0)}


def generar_pico(servicio_id: int, metrica: str, minutos: int = 30, factor: float = 4.0,
                 semilla: int | None = None) -> list[dict]:
    """Una muestra cada 10 s durante `minutos`; los últimos 2 min llevan el pico (× factor)."""
    rng = np.random.default_rng(semilla)
    media, sigma = BASE[metrica]
    n = minutos * 6
    valores = rng.normal(media, sigma, n)
    pico = min(12, n)
    valores[-pico:] = rng.normal(media * factor, sigma * factor, pico)
    valores = np.clip(valores, 0, 100 if metrica.endswith("_PCT") else None)
    if metrica == "TASA_ERROR":
        valores = np.clip(valores, 0, 1)
    ahora = datetime.now()
    return [{"servicio_id": servicio_id, "metrica": metrica, "valor": round(float(v), 4),
             "registrado_en": ahora - timedelta(seconds=10 * (n - 1 - i))} for i, v in enumerate(valores)]
