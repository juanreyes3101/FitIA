"""Pagos SIMULADOS. Nunca se integra una pasarela real.
El número de tarjeta solo se usa en memoria para Luhn y para sacar los últimos 4:
NO se guarda, NO se loguea y NO se devuelve."""
from app.db import engine, fila_dict
from app.errors import ApiError
from app.repositories import pagos as repo
from app.repositories import planes as repo_planes


def luhn_valido(numero: str) -> bool:
    if not numero.isdigit() or not 12 <= len(numero) <= 19:
        return False
    total = 0
    for i, d in enumerate(reversed(numero)):
        n = int(d)
        if i % 2 == 1:
            n *= 2
            if n > 9:
                n -= 9
        total += n
    return total % 10 == 0


def simular(usuario_id: int, datos) -> dict:
    ultimos4 = None
    if datos.metodo == "TARJETA":
        numero = "".join(ch for ch in (datos.numero_tarjeta or "") if ch.isdigit())
        if not luhn_valido(numero):
            raise ApiError("TARJETA_INVALIDA", "El número de tarjeta no es válido. Revisa los dígitos.", 400)
        ultimos4 = numero[-4:]
        del numero
    with engine().connect() as conn:
        plan = repo_planes.por_codigo(conn, datos.plan_codigo)
        if not plan or not plan.activo:
            raise ApiError("PLAN_INEXISTENTE", "Ese plan no existe o no está disponible.", 404)
        if plan.precio_cop == 0:
            raise ApiError("PLAN_GRATIS", "El plan Free no requiere pago.", 400)
        out = repo.simular(conn, usuario_id, datos.plan_codigo, datos.metodo, ultimos4)
        pago = repo.obtener(conn, out["p_pago_id"])
        suscripcion = repo.suscripcion_activa(conn, usuario_id)
    p = fila_dict(pago)
    return {
        "pago_id": p["id"], "estado": p["estado"], "motivo_rechazo": p["motivo_rechazo"],
        "referencia": p["referencia"], "monto_cop": p["monto_cop"], "metodo": p["metodo"],
        "ultimos4": p["ultimos4"], "simulado": True,
        "suscripcion": fila_dict(suscripcion) if suscripcion else None,
        "aviso": "Modo demostración: no se realizó ningún cobro real.",
    }
