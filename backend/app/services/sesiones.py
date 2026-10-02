from app.db import engine, fila_dict, filas_dict
from app.errors import ApiError
from app.repositories import sesiones as repo
from app.repositories.rutinas import dia_del_usuario

UMBRAL_DOLOR = 5


def registrar(usuario_id: int, datos) -> dict:
    with engine().begin() as conn:
        if datos.rutina_dia_id is not None and not dia_del_usuario(conn, datos.rutina_dia_id, usuario_id):
            raise ApiError("NO_ENCONTRADO", "Ese día de rutina no es tuyo o no existe.", 404)
        ejercicios = [e.model_dump() for e in datos.ejercicios]
        sesion_id = repo.crear(conn, usuario_id, datos.model_dump(exclude={"ejercicios"}, exclude_none=True),
                               ejercicios)
        sesion = repo.obtener(conn, sesion_id)
    alerta = datos.dolor_reportado > UMBRAL_DOLOR
    return {"sesion": fila_dict(sesion), "ejercicios": ejercicios, "alerta_dolor": alerta,
            "mensaje": ("Reportaste dolor alto. Para y consulta a tu entrenador o a un profesional de la salud."
                        if alerta else "¡Buen trabajo! Sesión registrada.")}


def progreso(usuario_id: int, dias: int) -> dict:
    with engine().connect() as conn:
        return {"dias": dias,
                "corporal": filas_dict(repo.progreso_corporal(conn, usuario_id, dias)),
                "adherencia_semanal": filas_dict(repo.adherencia(conn, usuario_id, dias))}
