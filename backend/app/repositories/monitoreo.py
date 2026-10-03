from datetime import datetime, timedelta

from sqlalchemy import and_, case, delete, func, insert, or_, select, text, update

from app.db import tabla


def salud_servicios(conn):
    return conn.execute(text("SELECT v.*, s.replicas_min, s.replicas_max FROM v_salud_servicios v "
                             "JOIN servicios s ON s.codigo = v.codigo ORDER BY v.codigo")).all()


def servicio_por_codigo(conn, codigo: str):
    s = tabla("servicios")
    return conn.execute(select(s).where(s.c.codigo == codigo)).first()


def servicios(conn, codigos: list[str] | None = None):
    s = tabla("servicios")
    q = select(s).order_by(s.c.id)
    if codigos:
        q = q.where(s.c.codigo.in_(codigos))
    return conn.execute(q).all()


def actualizar_servicio(conn, servicio_id: int, **valores) -> None:
    s = tabla("servicios")
    conn.execute(update(s).where(s.c.id == servicio_id).values(**valores))


def serie(conn, servicio_id: int, metrica: str, minutos: int):
    m = tabla("metricas")
    desde = datetime.now() - timedelta(minutes=minutos)
    return conn.execute(select(m.c.registrado_en, m.c.valor)
                        .where(m.c.servicio_id == servicio_id, m.c.metrica == metrica, m.c.registrado_en >= desde)
                        .order_by(m.c.registrado_en)).all()


def muestras(conn, servicio_id: int, metrica: str, desde: datetime, hasta: datetime) -> list[tuple]:
    """Muestras en (desde, hasta]."""
    m = tabla("metricas")
    filas = conn.execute(select(m.c.registrado_en, m.c.valor)
                         .where(m.c.servicio_id == servicio_id, m.c.metrica == metrica,
                                m.c.registrado_en > desde, m.c.registrado_en <= hasta)
                         .order_by(m.c.registrado_en)).all()
    return [(f.registrado_en, float(f.valor)) for f in filas]


def contar_latencias(conn, desde: datetime, hasta: datetime) -> dict[int, int]:
    m = tabla("metricas")
    return dict(conn.execute(select(m.c.servicio_id, func.count())
                             .where(m.c.metrica == "LATENCIA_MS", m.c.registrado_en > desde,
                                    m.c.registrado_en <= hasta)
                             .group_by(m.c.servicio_id)).all())


def insertar_metricas(conn, filas: list[dict]) -> None:
    if filas:
        conn.execute(insert(tabla("metricas")), filas)


def tasa_error_ia(conn, desde: datetime, hasta: datetime) -> tuple[int, int]:
    """(errores, total) de las llamadas a Gemini en el intervalo: si Gemini falla, la API pasa a Mock sin 5xx."""
    s = tabla("solicitudes_ia")
    fila = conn.execute(select(func.coalesce(func.sum(case((s.c.estado == "ERROR", 1), else_=0)), 0), func.count())
                        .where(s.c.proveedor == "gemini", s.c.creado_en > desde, s.c.creado_en <= hasta)).one()
    return int(fila[0]), int(fila[1])


# ---------- Knowledge: líneas base ----------
def insertar_linea_base(conn, servicio_id: int, metrica: str, base, ventana_min: int, ahora: datetime) -> int:
    return conn.execute(insert(tabla("lineas_base")).values(
        servicio_id=servicio_id, metrica=metrica, media=base.media, desviacion=base.desviacion, p95=base.p95,
        ventana_min=ventana_min, muestras=base.muestras, calculada_en=ahora)).inserted_primary_key[0]


def linea_base(conn, linea_base_id: int | None):
    if not linea_base_id:
        return None
    lb = tabla("lineas_base")
    return conn.execute(select(lb).where(lb.c.id == linea_base_id)).first()


def lineas_base_ultimas(conn):
    """La última línea base de cada (servicio, métrica)."""
    lb, s = tabla("lineas_base"), tabla("servicios")
    ultimas = (select(func.max(lb.c.id).label("id")).group_by(lb.c.servicio_id, lb.c.metrica)).subquery()
    return conn.execute(select(s.c.codigo.label("servicio"), lb.c.metrica, lb.c.media, lb.c.desviacion, lb.c.p95,
                               lb.c.ventana_min, lb.c.muestras, lb.c.calculada_en)
                        .join(ultimas, ultimas.c.id == lb.c.id).join(s, s.c.id == lb.c.servicio_id)
                        .order_by(s.c.codigo, lb.c.metrica)).all()


def ultimo_ciclo(conn):
    """Latido del worker: solo él mide la CPU (psutil) y lo hace en cada ciclo."""
    m = tabla("metricas")
    return conn.execute(select(func.max(m.c.registrado_en)).where(m.c.metrica == "CPU_PCT")).scalar()


def podar_lineas_base(conn, antes_de: datetime) -> None:
    lb, a = tabla("lineas_base"), tabla("anomalias")
    usadas = select(a.c.linea_base_id).where(a.c.linea_base_id.is_not(None))
    conn.execute(delete(lb).where(lb.c.calculada_en < antes_de, lb.c.id.not_in(usadas)))


# ---------- Analyze: anomalías ----------
def anomalias(conn, estado: str | None, limite: int):
    a, s = tabla("anomalias"), tabla("servicios")
    q = (select(a, s.c.codigo.label("servicio")).join(s, s.c.id == a.c.servicio_id)
         .order_by(a.c.detectada_en.desc(), a.c.id.desc()).limit(limite))
    if estado:
        q = q.where(a.c.estado == estado)
    return conn.execute(q).all()


def anomalias_abiertas(conn, servicio_ids: list[int] | None = None):
    a = tabla("anomalias")
    q = select(a).where(a.c.estado == "ABIERTA").order_by(a.c.id)
    if servicio_ids:
        q = q.where(a.c.servicio_id.in_(servicio_ids))
    return conn.execute(q).all()


def tramos_anomalos(conn, servicio_id: int, metrica: str, desde: datetime, ahora: datetime) -> list[tuple]:
    """(detectada_en, resuelta_en o ahora) de las anomalías que tocan la ventana: se sacan de la línea base."""
    a = tabla("anomalias")
    filas = conn.execute(select(a.c.detectada_en, a.c.resuelta_en)
                         .where(a.c.servicio_id == servicio_id, a.c.metrica == metrica,
                                or_(a.c.resuelta_en.is_(None), a.c.resuelta_en >= desde))).all()
    return [(f.detectada_en, f.resuelta_en or ahora) for f in filas]


def insertar_anomalia(conn, servicio_id: int, linea_base_id: int, metrica: str, observado: float, esperado: float,
                      z: float, severidad: str, ahora: datetime) -> int:
    z = max(min(z, 99999.0), -99999.0)  # DECIMAL(8,3)
    return conn.execute(insert(tabla("anomalias")).values(
        servicio_id=servicio_id, linea_base_id=linea_base_id, metrica=metrica, valor_observado=round(observado, 4),
        valor_esperado=round(esperado, 4), zscore=round(z, 3), severidad=severidad,
        detectada_en=ahora)).inserted_primary_key[0]


def marcar_mitigada(conn, anomalia_id: int) -> None:
    a = tabla("anomalias")  # trg_anomalia_resuelta pone resuelta_en
    conn.execute(update(a).where(a.c.id == anomalia_id, a.c.estado == "ABIERTA").values(estado="MITIGADA"))


# ---------- Plan/Execute: acciones ----------
def acciones(conn, limite: int, anomalia_id: int | None = None):
    ac, a, s = tabla("acciones_remediacion"), tabla("anomalias"), tabla("servicios")
    q = (select(ac, s.c.codigo.label("servicio"), a.c.metrica, a.c.severidad, a.c.zscore,
                a.c.estado.label("estado_anomalia"))
         .join(a, a.c.id == ac.c.anomalia_id).join(s, s.c.id == a.c.servicio_id)
         .order_by(ac.c.ejecutada_en.desc(), ac.c.id.desc()).limit(limite))
    if anomalia_id:
        q = q.where(ac.c.anomalia_id == anomalia_id)
    return conn.execute(q).all()


def insertar_accion(conn, anomalia_id: int, plan, ahora: datetime) -> int:
    return conn.execute(insert(tabla("acciones_remediacion")).values(
        anomalia_id=anomalia_id, tipo=plan.tipo, detalle=plan.detalle[:255], replicas_antes=plan.replicas_antes,
        replicas_despues=plan.replicas_despues, resultado="EXITOSA", ejecutada_en=ahora)).inserted_primary_key[0]


def ultima_accion_en(conn, servicio_id: int):
    """Para el enfriamiento: la última acción real (los avisos al admin no cuentan)."""
    ac, a = tabla("acciones_remediacion"), tabla("anomalias")
    return conn.execute(select(func.max(ac.c.ejecutada_en)).join(a, a.c.id == ac.c.anomalia_id)
                        .where(a.c.servicio_id == servicio_id, ac.c.tipo != "NOTIFICAR_ADMIN")).scalar()


def ultimo_escalado_mitigado(conn, servicio_id: int):
    """(anomalia_id, réplicas antes del incidente) de la última anomalía MITIGADA que escaló el servicio."""
    ac, a = tabla("acciones_remediacion"), tabla("anomalias")
    fila = conn.execute(select(a.c.id).join(ac, ac.c.anomalia_id == a.c.id)
                        .where(a.c.servicio_id == servicio_id, a.c.estado == "MITIGADA",
                               ac.c.tipo == "ESCALAR_ARRIBA")
                        .order_by(a.c.id.desc()).limit(1)).first()
    if not fila:
        return None
    previas = conn.execute(select(func.min(ac.c.replicas_antes))
                           .where(ac.c.anomalia_id == fila.id, ac.c.tipo == "ESCALAR_ARRIBA")).scalar()
    return fila.id, int(previas)


def ia_forzada_a_mock(conn) -> bool:
    """El monitor pasó la IA a Mock y la anomalía sigue abierta (el worker y la API son procesos distintos)."""
    ac, a = tabla("acciones_remediacion"), tabla("anomalias")
    return conn.execute(select(func.count()).select_from(ac).join(a, a.c.id == ac.c.anomalia_id)
                        .where(and_(ac.c.tipo == "CAMBIAR_PROVEEDOR_IA", a.c.estado == "ABIERTA"))).scalar_one() > 0

