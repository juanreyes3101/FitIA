from datetime import date

from app.ai.schema import CondicionAnonima, PerfilAnonimo
from app.db import a_json, engine, fila_dict, filas_dict
from app.errors import ApiError
from app.repositories import perfiles as repo
from app.repositories import solicitudes_ia as repo_sia
from app.repositories import pagos as repo_pagos
from app.repositories import usuarios as repo_usuarios


def clasificar_imc(imc: float | None) -> str | None:
    """Misma regla que fn_clasificar_imc (OMS)."""
    if imc is None:
        return None
    if imc < 18.5:
        return "BAJO_PESO"
    if imc < 25:
        return "NORMAL"
    if imc < 30:
        return "SOBREPESO"
    return "OBESIDAD"


def edad(nacimiento: date | None) -> int | None:
    if not nacimiento:
        return None
    hoy = date.today()
    return hoy.year - nacimiento.year - ((hoy.month, hoy.day) < (nacimiento.month, nacimiento.day))


def obtener(usuario_id: int) -> dict:
    with engine().connect() as conn:
        resumen = repo.resumen(conn, usuario_id)
        perfil = repo.obtener_perfil(conn, usuario_id)
        condiciones = repo.condiciones_activas(conn, usuario_id)
        usuario = repo_usuarios.obtener(conn, usuario_id)
        suscripcion = repo_pagos.suscripcion_activa(conn, usuario_id)
        cupo_ia = repo_sia.cupo_restante(conn, usuario_id)
    datos = fila_dict(resumen) if resumen else {}
    return {
        "usuario_id": usuario_id,
        "nombre": datos.get("nombre"),
        "email": datos.get("email"),
        "edad": edad(usuario.fecha_nacimiento) if usuario else None,
        "fecha_nacimiento": a_json(usuario.fecha_nacimiento) if usuario else None,
        "sexo": usuario.sexo if usuario else None,
        "medicion_actual": {k: datos.get(k) for k in ("peso_kg", "estatura_cm", "imc", "clasificacion_imc")},
        "perfil": ({k: a_json(v) for k, v in fila_dict(perfil).items() if k != "usuario_id"} if perfil else None),
        "condiciones": filas_dict(condiciones),
        "plan": fila_dict(suscripcion) if suscripcion else None,
        "cupo_ia_restante": cupo_ia,
    }


EDAD_MIN, EDAD_MAX = 14, 90
CAMPOS_CUENTA = {"fecha_nacimiento", "sexo"}


def actualizar(usuario_id: int, datos) -> dict:
    if datos.fecha_nacimiento is not None and not EDAD_MIN <= edad(datos.fecha_nacimiento) <= EDAD_MAX:
        raise ApiError("DATOS_INVALIDOS", f"FitIA es para personas de {EDAD_MIN} a {EDAD_MAX} años.", 400)
    with engine().begin() as conn:
        repo.guardar_perfil(conn, usuario_id,
                            datos.model_dump(exclude={"condiciones"} | CAMPOS_CUENTA, exclude_none=True))
        repo_usuarios.actualizar(conn, usuario_id, datos.model_dump(include=CAMPOS_CUENTA, exclude_none=True))
        if datos.condiciones is not None:
            catalogo = {c.codigo: c for c in repo.catalogo_condiciones(conn)}
            elegidas: dict[int, int] = {}
            for c in datos.condiciones:
                cat = catalogo.get(c.codigo)
                if not cat:
                    raise ApiError("DATOS_INVALIDOS", f"La condición {c.codigo} no existe.", 400)
                if cat.origen != "AUTORREPORTE":
                    raise ApiError("DATOS_INVALIDOS", f"{c.codigo} se calcula con tu IMC; registra una medición.", 400)
                elegidas[cat.id] = c.severidad
            repo.reemplazar_autorreporte(conn, usuario_id, elegidas)
    return obtener(usuario_id)


def registrar_medicion(usuario_id: int, datos) -> dict:
    with engine().begin() as conn:
        medicion_id = repo.insertar_medicion(conn, usuario_id, datos.model_dump(exclude_none=True))
        medicion = repo.medicion(conn, medicion_id)
        condiciones = repo.condiciones_activas(conn, usuario_id)
    m = fila_dict(medicion)
    return {"medicion": m | {"clasificacion": clasificar_imc(m["imc"])}, "condiciones": filas_dict(condiciones)}


def perfil_anonimo(conn, usuario_id: int) -> PerfilAnonimo:
    """Perfil que se envía a la IA: SIN nombre, correo ni teléfono."""
    perfil = repo.obtener_perfil(conn, usuario_id)
    if not perfil:
        raise ApiError("PERFIL_INCOMPLETO", "Completa tu perfil de salud antes de generar una rutina.", 400)
    resumen = repo.resumen(conn, usuario_id)
    usuario = repo_usuarios.obtener(conn, usuario_id)
    imc = float(resumen.imc) if resumen and resumen.imc is not None else None
    return PerfilAnonimo(
        edad=edad(usuario.fecha_nacimiento), imc=imc, clasificacion_imc=clasificar_imc(imc),
        nivel_actividad=perfil.nivel_actividad, objetivo=perfil.objetivo,
        condiciones=[CondicionAnonima(codigo=c.codigo, severidad=c.severidad)
                     for c in repo.condiciones_activas(conn, usuario_id)],
        dias_disponibles=perfil.dias_disponibles, minutos_por_sesion=perfil.minutos_por_sesion,
        lugar_entreno=perfil.lugar_entreno)
