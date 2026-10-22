"""Prueba de punta a punta de FitIA contra una API que ya está corriendo.

Recorre el flujo completo como lo haría una persona real:
  registro → onboarding → medición (trigger) → rutina con IA → sesión de entreno → progreso
  → pago Pro simulado → el admin ve el pago, los reportes y el monitoreo MAPE-K.

Solo usa la librería estándar de Python, así que corre en cualquier PC:

    python backend/scripts/prueba_punta_a_punta.py                       # API local o Docker (puerto 5000)
    python backend/scripts/prueba_punta_a_punta.py http://localhost:8080/api/v1   # a través de la web (Nginx)

Crea un usuario desechable `e2e.<fecha>@fitia.co` y al final el admin lo desactiva.
Sale con código 0 si todo pasó y 1 si algo falló. Hace 2 inicios de sesión: por el límite de
5 por minuto por IP, espera un minuto si la corres varias veces seguidas.
"""
import json
import random
import sys
import time
import urllib.error
import urllib.request

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5000/api/v1").rstrip("/")
CLAVE = "E2ePrueba2026*"
TARJETA_APROBADA = "4111111111111111"   # número de prueba que cumple Luhn (no es una tarjeta real)

resultados: list[tuple[bool, str]] = []


def llamar(metodo: str, ruta: str, cuerpo=None, token: str | None = None):
    datos = json.dumps(cuerpo).encode() if cuerpo is not None else None
    req = urllib.request.Request(BASE + ruta, data=datos, method=metodo)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req, timeout=90) as resp:
            texto = resp.read().decode()
            return resp.status, (json.loads(texto) if texto else None)
    except urllib.error.HTTPError as e:
        texto = e.read().decode()
        try:
            return e.code, json.loads(texto)
        except ValueError:
            return e.code, texto


def paso(nombre: str, condicion: bool, detalle: str = "") -> bool:
    resultados.append((condicion, nombre))
    marca = "OK  " if condicion else "FALLA"
    print(f"[{marca}] {nombre}" + (f"  ({detalle})" if detalle else ""))
    return condicion


def main() -> int:
    print(f"Prueba de punta a punta contra {BASE}\n")

    st, _ = llamar("GET", "/health")
    if not paso("1. La API responde /health", st == 200, f"HTTP {st}"):
        print("\nLa API no responde. ¿Está corriendo (npm run api:lan o docker compose up)?")
        return 1

    # --- Usuario nuevo ---
    email = f"e2e.{time.strftime('%Y%m%d%H%M%S')}{random.randint(100, 999)}@fitia.co"
    st, r = llamar("POST", "/auth/registro", {
        "nombres": "Prueba", "apellidos": "Punta a Punta", "email": email, "password": CLAVE,
        "fecha_nacimiento": "1998-05-10", "sexo": "F", "acepta_terminos": True})
    paso("2. Registro de un usuario nuevo", st == 201, f"HTTP {st} {email}")

    st, r = llamar("POST", "/auth/login", {"email": email, "password": CLAVE})
    tok = r.get("access_token") if st == 200 else None
    if not paso("3. Inicio de sesión con JWT", bool(tok), f"HTTP {st}"):
        return 1

    st, r = llamar("PUT", "/perfil", {
        "nivel_actividad": "SEDENTARIO", "objetivo": "BAJAR_PESO", "dias_disponibles": 3,
        "minutos_por_sesion": 45, "lugar_entreno": "GIMNASIO",
        "condiciones": [{"codigo": "DOLOR_LUMBAR", "severidad": 2}]}, tok)
    paso("4. Onboarding: perfil de salud con dolor lumbar", st == 200, f"HTTP {st}")

    st, r = llamar("POST", "/perfil/mediciones", {"peso_kg": 85, "estatura_cm": 165}, tok)
    paso("5. Medición 85 kg / 165 cm", st in (200, 201), f"HTTP {st}")

    st, perfil = llamar("GET", "/perfil", token=tok)
    codigos = {c.get("codigo") for c in (perfil or {}).get("condiciones", []) if c.get("activa", True)}
    paso("6. El trigger de la BD asignó OBESIDAD por el IMC (31,2)", "OBESIDAD" in codigos, f"condiciones: {sorted(codigos)}")

    # --- Rutina con IA ---
    st, r = llamar("POST", "/rutinas/generar", {}, tok)
    paso("7. Rutina generada con IA y validada", st in (200, 201), f"HTTP {st} proveedor={(r or {}).get('proveedor', '?')}")

    st, rutina = llamar("GET", "/rutinas/activa", token=tok)
    dias = (rutina or {}).get("dias", []) if st == 200 else []
    paso("8. Rutina activa con sus días", len(dias) == 3, f"{len(dias)} días")

    st, seguros = llamar("GET", "/ejercicios/seguros", token=tok)
    ids_seguros = {e["id"] for e in seguros} if st == 200 and isinstance(seguros, list) else set()
    ids_rutina = {e["ejercicio_id"] for d in dias for e in d.get("ejercicios", [])}
    paso("9. Ningún ejercicio de la rutina está contraindicado",
         bool(ids_rutina) and ids_rutina <= ids_seguros, f"{len(ids_rutina)} ejercicios revisados")

    # --- Entreno y progreso ---
    if dias:
        dia = dias[0]
        st, r = llamar("POST", "/sesiones", {
            "rutina_dia_id": dia["rutina_dia_id"], "duracion_min": 42, "esfuerzo_percibido": 6, "dolor_reportado": 2,
            "ejercicios": [{"ejercicio_id": e["ejercicio_id"], "series_hechas": e.get("series") or 1}
                           for e in dia.get("ejercicios", [])]}, tok)
        paso("10. Sesión de entreno registrada (esfuerzo 6, dolor 2)", st in (200, 201), f"HTTP {st}")
    else:
        paso("10. Sesión de entreno registrada", False, "no hay días en la rutina")

    st, prog = llamar("GET", "/progreso?dias=30", token=tok)
    paso("11. Progreso disponible", st == 200 and bool(prog), f"HTTP {st}")

    # --- Pago Pro simulado ---
    st, planes = llamar("GET", "/planes")
    pro = next((p for p in planes or [] if p.get("codigo") == "PREMIUM_MES"), None) if st == 200 else None
    st, pago = llamar("POST", "/pagos/simular", {
        "plan_codigo": pro["codigo"] if pro else "PREMIUM_MES", "metodo": "TARJETA",
        "numero_tarjeta": TARJETA_APROBADA}, tok)
    paso("12. Pago Pro simulado aprobado", st == 200 and (pago or {}).get("estado") == "APROBADO",
         f"HTTP {st} estado={(pago or {}).get('estado')}")
    paso("13. Solo se guardan los últimos 4 dígitos", TARJETA_APROBADA not in json.dumps(pago or {}))

    # --- Administrador ---
    st, r = llamar("POST", "/auth/login", {"email": "admin@fitia.co", "password": "Admin2026*"})
    adm = r.get("access_token") if st == 200 else None
    if not paso("14. El admin inicia sesión", bool(adm), f"HTTP {st}"):
        return 1

    st, usuarios = llamar("GET", "/admin/usuarios", token=adm)
    lista = usuarios.get("items", usuarios) if isinstance(usuarios, dict) else (usuarios or [])
    yo = next((u for u in lista if u.get("email") == email), None)
    paso("15. El admin ve al usuario nuevo con plan Pro", bool(yo) and str(yo.get("plan", "")).upper() in ("PREMIUM_MES", "FITIA PRO MENSUAL"),
         f"plan={(yo or {}).get('plan')}")

    st, ingresos = llamar("GET", "/reportes/ingresos", token=adm)
    paso("16. Reporte de ingresos disponible", st == 200, f"HTTP {st}")

    st, servicios = llamar("GET", "/monitoreo/servicios", token=adm)
    paso("17. Monitoreo: estado de los servicios", st == 200 and bool(servicios), f"{len(servicios or [])} servicios")

    st, pico = llamar("POST", "/monitoreo/simular-pico", {"servicio": "api", "metrica": "LATENCIA_MS"}, adm)
    anomalias = ((pico or {}).get("ciclo") or {}).get("anomalias", [])
    acciones = ((pico or {}).get("ciclo") or {}).get("acciones", [])
    if st in (200, 201) and not anomalias:
        # Si ya había una anomalía ABIERTA de esa métrica, MAPE-K no la duplica: también es correcto
        _, lista_an = llamar("GET", "/monitoreo/anomalias", token=adm)
        abierta = any(a.get("estado") == "ABIERTA" and a.get("servicio") == "api" and a.get("metrica") == "LATENCIA_MS"
                      for a in lista_an or [])
        paso("18. MAPE-K detecta el pico simulado", abierta, "ya había una anomalía abierta de latencia; no se duplica")
    else:
        paso("18. MAPE-K detecta el pico simulado y decide una acción", st in (200, 201) and bool(anomalias),
             f"{len(anomalias)} anomalías, {len(acciones)} acciones")

    # --- Limpieza ---
    if yo:
        st, _ = llamar("DELETE", f"/admin/usuarios/{yo['id']}", token=adm)
        paso("19. El admin desactiva el usuario de prueba", st == 200, f"HTTP {st}")

    fallas = [n for ok, n in resultados if not ok]
    print(f"\n{len(resultados) - len(fallas)} de {len(resultados)} pasos OK.")
    if fallas:
        print("Fallaron: " + "; ".join(fallas))
    return 1 if fallas else 0


if __name__ == "__main__":
    sys.exit(main())
