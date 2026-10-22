"""Rate-limit por IP con y sin proxy inverso (Docker pone Nginx delante de la API)."""
from app import create_app
from app.config import TestConfig

MALA = {"email": "nadie@fitia.co", "password": "noexiste1"}


def _app(saltos: int):
    class Cfg(TestConfig):
        RATE_LIMIT_ACTIVO = True
        PROXY_SALTOS = saltos
    return create_app(Cfg())


def _intentos(client, ips):
    return [client.post("/api/v1/auth/login", json=MALA,
                        headers={"X-Forwarded-For": ip}).status_code for ip in ips]


def test_sin_proxy_no_se_puede_falsear_la_ip():
    # Cada intento dice venir de otra IP, pero sin proxy de confianza se ignora el encabezado
    codigos = _intentos(_app(0).test_client(), [f"10.0.0.{i}" for i in range(6)])
    assert codigos[:5] == [401] * 5 and codigos[5] == 429


def test_detras_de_nginx_cada_cliente_tiene_su_limite():
    client = _app(1).test_client()
    # Seis personas distintas detrás del mismo Nginx: ninguna queda bloqueada por las demás
    assert _intentos(client, [f"10.0.1.{i}" for i in range(6)]) == [401] * 6
    # La misma persona seis veces: la sexta se bloquea
    assert _intentos(client, ["10.0.2.7"] * 6)[5] == 429
