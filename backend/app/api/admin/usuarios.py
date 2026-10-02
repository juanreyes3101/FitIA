from flask import jsonify, request
from werkzeug.security import generate_password_hash

from app.api.esquemas import UsuarioAdminCrear, UsuarioAdminEditar, cuerpo
from app.db import engine, filas_dict
from app.errors import ApiError
from app.middleware.auth_jwt import requiere_rol, usuario_actual_id
from app.repositories import usuarios as repo
from app.services.auth import usuario_publico


def registrar(bp) -> None:
    @bp.get("/usuarios")
    @requiere_rol("ADMIN")
    def usuarios_listar():
        with engine().connect() as conn:
            return jsonify(filas_dict(repo.listar(conn, request.args.get("rol"), request.args.get("estado"))))

    @bp.get("/usuarios/<int:usuario_id>")
    @requiere_rol("ADMIN")
    def usuarios_obtener(usuario_id: int):
        with engine().connect() as conn:
            fila = repo.obtener(conn, usuario_id)
        if not fila:
            raise ApiError("NO_ENCONTRADO", "El usuario no existe.", 404)
        return jsonify(usuario_publico(fila))

    @bp.post("/usuarios")
    @requiere_rol("ADMIN")
    def usuarios_crear():
        datos = cuerpo(UsuarioAdminCrear)
        with engine().begin() as conn:
            if repo.buscar_por_email(conn, datos.email.lower()):
                raise ApiError("CORREO_EN_USO", "Ya existe una cuenta con ese correo.", 409)
            usuario_id = repo.crear(conn, {
                "rol_id": repo.id_rol(conn, datos.rol), "nombres": datos.nombres, "apellidos": datos.apellidos,
                "email": datos.email.lower(), "password_hash": generate_password_hash(datos.password),
                "telefono": datos.telefono, "acepta_terminos": True})
            if datos.rol == "ENTRENADOR":
                repo.crear_entrenador(conn, usuario_id)
            fila = repo.obtener(conn, usuario_id)
        return jsonify(usuario_publico(fila)), 201

    @bp.put("/usuarios/<int:usuario_id>")
    @requiere_rol("ADMIN")
    def usuarios_editar(usuario_id: int):
        datos = cuerpo(UsuarioAdminEditar)
        cambios = datos.model_dump(exclude={"rol"}, exclude_none=True)
        if usuario_id == usuario_actual_id() and (datos.estado not in (None, "ACTIVO") or
                                                  datos.rol not in (None, "ADMIN")):
            raise ApiError("PROHIBIDO", "No puedes quitarte el rol de admin ni desactivar tu propia cuenta.", 403)
        with engine().begin() as conn:
            if not repo.obtener(conn, usuario_id):
                raise ApiError("NO_ENCONTRADO", "El usuario no existe.", 404)
            if datos.rol:
                cambios["rol_id"] = repo.id_rol(conn, datos.rol)
                if datos.rol == "ENTRENADOR":
                    repo.crear_entrenador(conn, usuario_id)
            repo.actualizar(conn, usuario_id, cambios)  # trg_usuarios_auditoria registra rol/estado
            fila = repo.obtener(conn, usuario_id)
        return jsonify(usuario_publico(fila))

    @bp.delete("/usuarios/<int:usuario_id>")
    @requiere_rol("ADMIN")
    def usuarios_borrar(usuario_id: int):
        if usuario_id == usuario_actual_id():
            raise ApiError("PROHIBIDO", "No puedes desactivar tu propia cuenta.", 403)
        with engine().begin() as conn:
            if not repo.obtener(conn, usuario_id):
                raise ApiError("NO_ENCONTRADO", "El usuario no existe.", 404)
            repo.actualizar(conn, usuario_id, {"estado": "INACTIVO"})
        return jsonify({"ok": True, "id": usuario_id, "estado": "INACTIVO"})
