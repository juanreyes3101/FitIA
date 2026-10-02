"""GeminiProvider: capa GRATUITA de Google AI Studio (sin tarjeta, costo $0)."""
import json
import time

from pydantic import ValidationError

from app.ai.base import AdaptadorIA, ErrorProveedorIA, ResultadoIA
from app.ai.prompts import SISTEMA, construir_prompt
from app.ai.schema import EjercicioCatalogo, PerfilAnonimo, RutinaIA


class GeminiProvider(AdaptadorIA):
    nombre = "gemini"

    def __init__(self, api_key: str, modelo: str, timeout_seg: int = 20):
        if not api_key:
            raise ErrorProveedorIA("Falta GEMINI_API_KEY en backend/.env", abre_breaker_ya=True)
        from google import genai
        from google.genai import types
        self._types = types
        self._cliente = genai.Client(api_key=api_key,
                                     http_options=types.HttpOptions(timeout=timeout_seg * 1000))
        self.modelo = modelo

    def generar(self, perfil: PerfilAnonimo, catalogo: list[EjercicioCatalogo],
                errores_previos: list[str] | None = None) -> ResultadoIA:
        t0 = time.perf_counter()
        try:
            resp = self._cliente.models.generate_content(
                model=self.modelo,
                contents=construir_prompt(perfil, catalogo, errores_previos),
                config=self._types.GenerateContentConfig(
                    system_instruction=SISTEMA, response_mime_type="application/json", temperature=0.4),
            )
        except Exception as exc:  # el SDK lanza errores propios; se clasifican por código/texto
            texto = str(exc)
            codigo = getattr(exc, "code", None)
            cuota = codigo == 429 or "RESOURCE_EXHAUSTED" in texto or "429" in texto
            sin_modelo = codigo == 404 or "NOT_FOUND" in texto
            raise ErrorProveedorIA(f"Gemini falló: {texto[:300]}", abre_breaker_ya=cuota or sin_modelo) from exc

        latencia = int((time.perf_counter() - t0) * 1000)
        try:
            rutina = RutinaIA.model_validate(json.loads(resp.text or ""))
        except (json.JSONDecodeError, ValidationError) as exc:
            raise ErrorProveedorIA(f"Gemini devolvió un JSON que no cumple el esquema: {str(exc)[:300]}") from exc
        uso = getattr(resp, "usage_metadata", None)
        return ResultadoIA(rutina=rutina, proveedor=self.nombre, modelo=self.modelo, latencia_ms=latencia,
                           tokens_entrada=getattr(uso, "prompt_token_count", None),
                           tokens_salida=getattr(uso, "candidates_token_count", None))
