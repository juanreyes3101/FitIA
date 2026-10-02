"""
FitIA — Demo del avance (backend).

Uso (con la API ya corriendo en otra terminal):
    cd backend
    .venv\\Scripts\\python demo_avance.py

Solo usa la librería estándar de Python (no instala nada).
"""
import json
import sys
import urllib.error
import urllib.request

BASE = "http://127.0.0.1:5000/api/v1"
LAURA = {"email": "laura@fitia.co", "password": "Demo2026*"}

try:  # que las tildes y emojis se vean bien en la consola de Windows
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass


def llamar(metodo, ruta, cuerpo=None, token=None):
    datos = json.dumps(cuerpo).encode() if cuerpo is not None else None
    req = urllib.request.Request(BASE + ruta, data=datos, method=metodo)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.status, json.loads(r.read() or b"{}")
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or b"{}")
    except urllib.error.URLError:
        print("\n❌ No hay conexión con la API. ¿La levantaste en otra terminal?")
        print("   cd backend  →  .venv\\Scripts\\flask --app wsgi run")
        sys.exit(1)


def titulo(texto):
    print("\n" + "=" * 64 + f"\n  {texto}\n" + "=" * 64)


def pausa():
    input("\n   [Enter para continuar] ")


def imprimir_rutina(r):
    print(f"\n   Rutina: {r.get('nombre')}   (estado: {r.get('estado')}, origen: {r.get('origen')})")
    if r.get("explicacion"):
        print(f"   Por qué esta rutina: {r['explicacion']}")
    for dia in r.get("dias", []):
        print(f"\n   DÍA {dia['dia_numero']} — {dia['enfoque']}")
        for ej in dia["ejercicios"]:
            if ej.get("repeticiones"):
                vol = f"{ej['series']} x {ej['repeticiones']} reps"
            else:
                vol = f"{ej.get('series') or 1} x {ej['duracion_seg']} s"
            sello = "  ✔ seguro para tu espalda" if ej.get("apto_lumbar") else ""
            print(f"     {ej['orden']}. {ej['nombre']:<42} {vol:<16}{sello}")


def main():
    titulo("1. ¿La plataforma está viva?  GET /health")
    s, r = llamar("GET", "/health")
    print(f"   HTTP {s} → estado: {r.get('estado')} | base de datos: {r.get('bd')} | "
          f"IA: {r.get('ia', {}).get('proveedor')}")
    pausa()

    titulo("2. Calculadora de IMC pública  GET /imc?peso=78&estatura=165")
    s, r = llamar("GET", "/imc?peso=78&estatura=165")
    print(f"   HTTP {s} → IMC {r.get('imc')} = {r.get('clasificacion')}")
    print(f"   {r.get('mensaje')}")
    pausa()

    titulo("3. Login de Laura (sobrepeso + dolor lumbar)  POST /auth/login")
    s, r = llamar("POST", "/auth/login", LAURA)
    if s != 200:
        print(f"   HTTP {s} → {r}")
        sys.exit(1)
    token = r["access_token"]
    u = r["usuario"]
    print(f"   HTTP {s} → Bienvenida {u.get('nombres')} {u.get('apellidos')}. Token JWT recibido "
          f"({token[:25]}...)")
    pausa()

    titulo("4. Generar rutina personalizada con IA  POST /rutinas/generar")
    print("   La IA solo recibe ejercicios SEGUROS para Laura → el validador revisa 7 reglas →")
    print("   la base de datos bloquea cualquier ejercicio contraindicado.")
    s, r = llamar("POST", "/rutinas/generar", token=token)
    if s in (200, 201):
        print(f"\n   HTTP {s} → rutina generada por: {r.get('proveedor')}")
        imprimir_rutina(r)
    else:
        print(f"\n   HTTP {s} → {r.get('error', {}).get('mensaje', r)}")
        print("   (Laura ya usó su cupo de IA del mes en el plan gratis: así funciona el modelo de negocio.)")
        print("   Mostramos su rutina vigente:  GET /rutinas/activa")
        s, r = llamar("GET", "/rutinas/activa", token=token)
        imprimir_rutina(r)
    pausa()

    titulo("5. Seguridad: sin token no hay acceso  POST /rutinas/generar (sin JWT)")
    s, r = llamar("POST", "/rutinas/generar")
    print(f"   HTTP {s} → {r.get('error', {}).get('mensaje', r)}")

    print("\n✅ Fin de la demo. Backend: Flask + MySQL + IA (Gemini/Mock) · 52 pruebas automáticas.\n")


if __name__ == "__main__":
    main()
