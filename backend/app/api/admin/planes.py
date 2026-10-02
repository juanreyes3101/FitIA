from app.api.admin.crud import registrar_crud
from app.api.esquemas import PlanAdmin


def registrar(bp) -> None:
    registrar_crud(bp, "planes", PlanAdmin, "plan", borrado_logico=True)
