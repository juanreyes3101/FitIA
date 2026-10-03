"""Fase Analizar de MAPE-K (funciones puras con Pandas, sin BD).

- Línea base: EWMA (α = 0.3) de las medias por minuto → μ; desviación estándar de las muestras → σ.
- Valor actual: media de las muestras del último intervalo del worker (no entra en la línea base).
- z = (x − μ) / σ. Es anomalía si z > umbral (un solo lado: una latencia o un error BAJOS no son un
  problema) o si la tasa de error pasa del umbral. Severidad: 3-4σ BAJA, 4-5σ MEDIA, > 5σ ALTA;
  tasa de error ≥ 50 % = CRÍTICA (el servicio está prácticamente caído).
"""
from dataclasses import dataclass
from datetime import datetime

import pandas as pd

ALFA = 0.3
MIN_MUESTRAS = 10
ERROR_CRITICO = 0.5
# Piso de σ por métrica: en reposo la CPU o la memoria casi no varían y cualquier +0,5 % daría z > 3
PISO_SIGMA = {"LATENCIA_MS": 5.0, "CPU_PCT": 2.0, "MEM_PCT": 1.0}


@dataclass(frozen=True)
class LineaBase:
    media: float
    desviacion: float
    p95: float
    muestras: int


@dataclass(frozen=True)
class Deteccion:
    zscore: float
    severidad: str


def linea_base(muestras: list[tuple[datetime, float]], metrica: str | None = None) -> LineaBase | None:
    if len(muestras) < MIN_MUESTRAS:
        return None
    df = pd.DataFrame(muestras, columns=["t", "valor"])
    df["valor"] = df["valor"].astype(float)
    por_minuto = df.set_index(pd.to_datetime(df["t"]))["valor"].resample("1min").mean().dropna()
    media = float(por_minuto.ewm(alpha=ALFA, adjust=False).mean().iloc[-1])
    desv = float(df["valor"].std(ddof=0))
    # Piso de σ: una serie casi constante no debe volver anomalía cualquier variación mínima
    desv = max(desv, abs(media) * 0.01, PISO_SIGMA.get(metrica or "", 1e-3))
    return LineaBase(media=round(media, 4), desviacion=round(desv, 4),
                     p95=round(float(df["valor"].quantile(0.95)), 4), muestras=len(df))


def valor_actual(muestras: list[tuple[datetime, float]]) -> float | None:
    if not muestras:
        return None
    return float(sum(float(v) for _, v in muestras) / len(muestras))


def zscore(valor: float, base: LineaBase) -> float:
    return (valor - base.media) / base.desviacion


def severidad(z: float, metrica: str, valor: float, umbral_error: float) -> str:
    if metrica == "TASA_ERROR" and valor >= ERROR_CRITICO:
        return "CRITICA"
    if z > 5:
        return "ALTA"
    if z > 4:
        return "MEDIA"
    if metrica == "TASA_ERROR" and valor > umbral_error:
        return "MEDIA"  # pasar del 5 % de errores ya es serio aunque la serie sea ruidosa
    return "BAJA"


def es_anomalo(valor: float, base: LineaBase, metrica: str, umbral_z: float, umbral_error: float) -> bool:
    return zscore(valor, base) > umbral_z or (metrica == "TASA_ERROR" and valor > umbral_error)


def detectar(valor: float, base: LineaBase, metrica: str, umbral_z: float = 3.0,
             umbral_error: float = 0.05) -> Deteccion | None:
    if not es_anomalo(valor, base, metrica, umbral_z, umbral_error):
        return None
    z = zscore(valor, base)
    return Deteccion(zscore=round(z, 3), severidad=severidad(z, metrica, valor, umbral_error))
