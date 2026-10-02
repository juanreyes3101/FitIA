"""Configuración leída desde backend/.env (las llaves nunca viven en los clientes)."""
import os
from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")


def _int(nombre: str, defecto: int) -> int:
    valor = os.getenv(nombre)
    return int(valor) if valor not in (None, "") else defecto


class Config:
    TESTING = False

    DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
    DB_PORT = _int("DB_PORT", 3306)
    DB_NAME = os.getenv("DB_NAME", "fitia")
    DB_USER = os.getenv("DB_USER", "")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "")

    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=7)
    CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()]

    AI_PROVIDER = os.getenv("AI_PROVIDER", "mock").lower()
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-flash-latest")
    IA_MAX_SOLICITUDES_DIA = _int("IA_MAX_SOLICITUDES_DIA", 200)
    IA_TIMEOUT_SEG = _int("IA_TIMEOUT_SEG", 20)

    MONITOR_INTERVAL_SEG = _int("MONITOR_INTERVAL_SEG", 60)
    MONITOR_VENTANA_MIN = _int("MONITOR_VENTANA_MIN", 30)
    METRICAS_FLUSH_SEG = 10

    RATE_LIMIT_ACTIVO = True
    SCHEDULER_ACTIVO = True

    @property
    def DATABASE_URL(self) -> str:  # noqa: N802 (estilo de config de Flask)
        from urllib.parse import quote_plus
        return (f"mysql+pymysql://{quote_plus(self.DB_USER)}:{quote_plus(self.DB_PASSWORD)}"
                f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}?charset=utf8mb4")

    def validar(self) -> None:
        faltan = [n for n in ("DB_USER", "DB_PASSWORD", "JWT_SECRET_KEY") if not getattr(self, n)]
        if faltan:
            raise RuntimeError(f"Faltan variables en backend/.env: {', '.join(faltan)}")
        if self.AI_PROVIDER not in ("gemini", "mock"):
            raise RuntimeError("AI_PROVIDER debe ser 'gemini' o 'mock'")


class TestConfig(Config):
    TESTING = True
    AI_PROVIDER = "mock"
    RATE_LIMIT_ACTIVO = False
    SCHEDULER_ACTIVO = False
