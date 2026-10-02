"""Extensiones compartidas (aquí para evitar imports circulares)."""
from flask_cors import CORS
from flask_jwt_extended import JWTManager

jwt = JWTManager()
cors = CORS()
