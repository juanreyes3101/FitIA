from app.api.admin.crud import registrar_crud
from app.api.esquemas import EjercicioAdmin


def registrar(bp) -> None:
    # `ejercicios` no tiene columna activo: borrado físico (falla con 409 si alguna rutina lo usa)
    registrar_crud(bp, "ejercicios", EjercicioAdmin, "ejercicio", borrado_logico=False)
