from flask import Blueprint

from app.api.admin import anuncios, condiciones, contraindicaciones, ejercicios, planes, usuarios

bp = Blueprint("admin", __name__, url_prefix="/admin")
for modulo in (usuarios, ejercicios, condiciones, contraindicaciones, planes, anuncios):
    modulo.registrar(bp)
