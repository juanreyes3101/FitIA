from app.db import engine, filas_dict
from app.errors import ApiError
from app.repositories import rutinas as repo
from app.repositories import usuarios as repo_usuarios


def pendientes() -> list[dict]:
    with engine().connect() as conn:
        return filas_dict(repo.pendientes(conn))


def revisar(rutina_id: int, entrenador_id: int, rol: str, datos) -> dict:
    with engine().begin() as conn:
        rutina = repo.obtener(conn, rutina_id)
        if not rutina:
            raise ApiError("NO_ENCONTRADO", "La rutina no existe.", 404)
        if rutina.estado not in ("VALIDADA", "ACTIVA"):
            raise ApiError("ESTADO_INVALIDO", f"No puedes revisar una rutina en estado {rutina.estado}.", 409)
        # entrenador_revisor_id apunta a `entrenadores`: un admin que revisa queda registrado como tal
        if rol == "ADMIN":
            repo_usuarios.crear_entrenador(conn, entrenador_id)

        for ajuste in datos.ajustes or []:
            fila = repo.ejercicio_de_rutina(conn, ajuste.rutina_ejercicio_id)
            if not fila or fila.rutina_id != rutina_id:
                raise ApiError("DATOS_INVALIDOS",
                               f"El ejercicio {ajuste.rutina_ejercicio_id} no pertenece a esta rutina.", 400)
            cambios = ajuste.model_dump(exclude={"rutina_ejercicio_id"}, exclude_unset=True)
            reps = cambios.get("repeticiones", fila.repeticiones)
            dur = cambios.get("duracion_seg", fila.duracion_seg)
            if reps is None and dur is None:
                raise ApiError("DATOS_INVALIDOS", "Cada ejercicio necesita repeticiones o duración.", 400)
            repo.ajustar_ejercicio(conn, ajuste.rutina_ejercicio_id, cambios)

        if datos.accion == "APROBAR":
            repo.archivar_activas(conn, rutina.usuario_id, excepto_id=rutina_id)
            repo.cambiar_estado(conn, rutina_id, "ACTIVA", revisor_id=entrenador_id,
                                observaciones=datos.observaciones)
        elif datos.accion == "RECHAZAR":
            if not datos.observaciones:
                raise ApiError("DATOS_INVALIDOS", "Explica al usuario por qué rechazas la rutina.", 400)
            repo.cambiar_estado(conn, rutina_id, "RECHAZADA", revisor_id=entrenador_id,
                                observaciones=datos.observaciones)
        else:  # AJUSTAR: queda en su estado, con revisor y observaciones
            repo.cambiar_estado(conn, rutina_id, rutina.estado, revisor_id=entrenador_id,
                                observaciones=datos.observaciones)
        return repo.detalle(conn, rutina_id)
