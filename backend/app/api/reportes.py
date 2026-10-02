"""Reportes administrativos con Pandas → JSON o CSV."""
from flask import Blueprint, Response, jsonify, request

from app.db import a_json, engine
from app.errors import ApiError
from app.middleware.auth_jwt import requiere_rol
from app.repositories import reportes as repo

bp = Blueprint("reportes", __name__, url_prefix="/reportes")


def _ingresos(conn):
    df = repo.ingresos(conn)
    total = float(df["total_cop"].astype(float).sum()) if not df.empty else 0.0
    return df, {"total_cop": total, "pagos_aprobados": int(df["pagos_aprobados"].sum()) if not df.empty else 0}


def _uso_ia(conn):
    df = repo.uso_ia(conn)
    if df.empty:
        return df, {"solicitudes": 0}
    sol = int(df["solicitudes"].sum())
    return df, {"solicitudes": sol, "exitosas": int(df["exitosas"].astype(int).sum()),
                "rechazadas_por_seguridad": int(df["rechazadas_por_seguridad"].astype(int).sum()),
                "por_proveedor": {k: int(v) for k, v in df.groupby("proveedor")["solicitudes"].sum().items()}}


def _adherencia(conn):
    df = repo.adherencia(conn)
    if df.empty:
        return df, {"sesiones": 0}
    return df, {"sesiones": int(df["sesiones"].sum()),
                "tasa_completadas": round(float(df["completadas"].astype(float).sum() / df["sesiones"].sum()), 3),
                "dolor_promedio": round(float(df["dolor_promedio"].astype(float).mean()), 2)}


REPORTES = {"ingresos": _ingresos, "uso-ia": _uso_ia, "adherencia": _adherencia}


@bp.get("/<nombre>")
@requiere_rol("ADMIN")
def reporte(nombre: str):
    if nombre not in REPORTES:
        raise ApiError("NO_ENCONTRADO", f"Reporte desconocido. Usa: {', '.join(REPORTES)}.", 404)
    with engine().connect() as conn:
        df, resumen = REPORTES[nombre](conn)
    if request.args.get("formato", "json").lower() == "csv":
        return Response(df.to_csv(index=False), mimetype="text/csv",
                        headers={"Content-Disposition": f"attachment; filename=reporte_{nombre}.csv"})
    filas = df.astype(object).where(df.notna(), None)
    datos = [{k: a_json(v) for k, v in fila.items()} for fila in filas.to_dict(orient="records")]
    return jsonify({"reporte": nombre, "resumen": resumen, "filas": datos})
