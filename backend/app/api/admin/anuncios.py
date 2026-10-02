from app.api.admin.crud import registrar_crud
from app.api.esquemas import AnuncioAdmin


def registrar(bp) -> None:
    registrar_crud(bp, "anuncios", AnuncioAdmin, "anuncio", borrado_logico=True)
