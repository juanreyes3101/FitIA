"""Fase Planificar de MAPE-K: tabla de políticas (funciones puras, sin BD).

La primera regla que coincide con (servicio, métrica) decide la acción. Siempre se respetan
replicas_min/replicas_max y un enfriamiento por servicio (salvo NOTIFICAR_ADMIN, que nunca se frena).
"""
from dataclasses import dataclass
from datetime import datetime

# (servicios, métricas, acción). None = cualquiera.
POLITICAS: list[tuple[tuple[str, ...] | None, tuple[str, ...] | None, str]] = [
    (("ia",), ("LATENCIA_MS", "TASA_ERROR"), "CAMBIAR_PROVEEDOR_IA"),
    (("api", "web"), ("TASA_ERROR",), "REINICIAR_WORKER"),
    (("api", "web"), ("LATENCIA_MS", "RPS", "CPU_PCT"), "ESCALAR_ARRIBA"),
    (None, None, "NOTIFICAR_ADMIN"),
]

NOMBRE_METRICA = {"LATENCIA_MS": "latencia", "TASA_ERROR": "tasa de error", "RPS": "peticiones por segundo",
                  "CPU_PCT": "CPU", "MEM_PCT": "memoria"}


@dataclass(frozen=True)
class ServicioEstado:
    codigo: str
    replicas_actuales: int
    replicas_min: int
    replicas_max: int


@dataclass(frozen=True)
class AccionPlan:
    tipo: str
    detalle: str
    replicas_antes: int | None = None
    replicas_despues: int | None = None


def accion_de(servicio: str, metrica: str) -> str:
    for servicios, metricas, accion in POLITICAS:
        if (servicios is None or servicio in servicios) and (metricas is None or metrica in metricas):
            return accion
    return "NOTIFICAR_ADMIN"


def en_enfriamiento(ultima_accion_en: datetime | None, ahora: datetime, enfriamiento_seg: int) -> int:
    """Segundos que faltan de enfriamiento (0 = libre)."""
    if ultima_accion_en is None:
        return 0
    restante = enfriamiento_seg - (ahora - ultima_accion_en).total_seconds()
    return max(0, int(restante + 0.999))


def planificar(servicio: ServicioEstado, metrica: str, severidad: str, ultima_accion_en: datetime | None,
               ahora: datetime, enfriamiento_seg: int) -> list[AccionPlan]:
    nombre = NOMBRE_METRICA.get(metrica, metrica)
    tipo = accion_de(servicio.codigo, metrica)
    faltan = en_enfriamiento(ultima_accion_en, ahora, enfriamiento_seg)
    plan: list[AccionPlan] = []

    if tipo != "NOTIFICAR_ADMIN" and faltan:
        plan.append(AccionPlan("NOTIFICAR_ADMIN", f"En enfriamiento (faltan {faltan} s): solo se avisa al "
                                                  f"administrador por {nombre} alta en {servicio.codigo}"))
    elif tipo == "ESCALAR_ARRIBA":
        if servicio.replicas_actuales < servicio.replicas_max:
            antes, despues = servicio.replicas_actuales, servicio.replicas_actuales + 1
            plan.append(AccionPlan(tipo, f"Escalar {servicio.codigo} de {antes} a {despues} réplicas "
                                         f"(máx. {servicio.replicas_max}) por {nombre} alta", antes, despues))
        else:
            plan.append(AccionPlan("NOTIFICAR_ADMIN", f"Réplicas de {servicio.codigo} al máximo "
                                                      f"({servicio.replicas_max}): alertar al administrador"))
    elif tipo == "CAMBIAR_PROVEEDOR_IA":
        plan.append(AccionPlan(tipo, f"Pasar la IA al proveedor Mock mientras la {nombre} siga alta"))
    elif tipo == "REINICIAR_WORKER":
        plan.append(AccionPlan(tipo, f"Reiniciar un worker de {servicio.codigo} (simulado) por {nombre} alta"))
    else:
        plan.append(AccionPlan("NOTIFICAR_ADMIN", f"{nombre.capitalize()} alta en {servicio.codigo}: "
                                                  f"alertar al administrador"))

    if severidad == "CRITICA" and not any(a.tipo == "NOTIFICAR_ADMIN" for a in plan):
        plan.append(AccionPlan("NOTIFICAR_ADMIN", f"Severidad CRÍTICA en {servicio.codigo}: alertar al administrador"))
    return plan


def planificar_reintento(servicio: ServicioEstado, metrica: str, ultima_accion_en: datetime | None,
                         ahora: datetime, enfriamiento_seg: int) -> AccionPlan | None:
    """La anomalía sigue abierta tras el enfriamiento: se repite la acción (sin volver a notificar)."""
    if en_enfriamiento(ultima_accion_en, ahora, enfriamiento_seg):
        return None
    plan = planificar(servicio, metrica, "BAJA", None, ahora, enfriamiento_seg)
    accion = plan[0]
    if accion.tipo == "NOTIFICAR_ADMIN":
        return None
    return AccionPlan(accion.tipo, f"Sigue alta tras {enfriamiento_seg} s de enfriamiento → {accion.detalle[0].lower()}"
                                   f"{accion.detalle[1:]}", accion.replicas_antes, accion.replicas_despues)


def planificar_retorno(servicio: ServicioEstado, replicas_previas: int, ultima_accion_en: datetime | None,
                       ahora: datetime, enfriamiento_seg: int) -> AccionPlan | None:
    """Tras mitigar, devolver una réplica por vez hasta el nivel previo al incidente."""
    objetivo = max(replicas_previas, servicio.replicas_min)
    if servicio.replicas_actuales <= objetivo or en_enfriamiento(ultima_accion_en, ahora, enfriamiento_seg):
        return None
    antes, despues = servicio.replicas_actuales, servicio.replicas_actuales - 1
    return AccionPlan("ESCALAR_ABAJO", f"Carga normal sostenida: escalar {servicio.codigo} de {antes} a "
                                       f"{despues} réplicas", antes, despues)
