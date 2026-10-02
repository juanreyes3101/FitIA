"""Banda de la línea base calculada al vuelo con Pandas (EWMA α=0.3 y desviación móvil).
El ciclo MAPE-K completo (worker que guarda en lineas_base y detecta anomalías) es la Etapa 6."""
import pandas as pd

ALFA = 0.3
K_SIGMA = 2


def serie_con_banda(filas, frecuencia: str = "1min") -> dict:
    if not filas:
        return {"puntos": [], "resumen": None}
    df = pd.DataFrame(filas, columns=["registrado_en", "valor"])
    df["valor"] = df["valor"].astype(float)
    serie = df.set_index(pd.to_datetime(df["registrado_en"]))["valor"].resample(frecuencia).mean().dropna()
    media = serie.ewm(alpha=ALFA, adjust=False).mean()
    desv = serie.rolling(window=max(3, min(30, len(serie))), min_periods=2).std().fillna(0)
    puntos = [{"t": t.isoformat(), "valor": round(v, 4), "media": round(m, 4),
               "banda_inf": round(max(m - K_SIGMA * d, 0), 4), "banda_sup": round(m + K_SIGMA * d, 4)}
              for t, v, m, d in zip(serie.index, serie.values, media.values, desv.values)]
    return {"puntos": puntos, "resumen": {
        "muestras": int(len(df)), "media": round(float(df["valor"].mean()), 4),
        "desviacion": round(float(df["valor"].std(ddof=0)), 4),
        "p95": round(float(df["valor"].quantile(0.95)), 4)}}
