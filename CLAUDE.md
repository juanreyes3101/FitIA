# FitIA — contexto para Claude Code

Proyecto Integrador CUN (Ingeniería de Sistemas, 2026). Se califica en **Bases de Datos**, **Arquitectura de Software** e **Innovación Tecnológica de Redes**. Equipo: Juan Reyes, Juan Delgado, Vanesa Vargas y Santiago Castañeda.

FitIA genera rutinas de ejercicio personalizadas con IA según el IMC y las molestias del usuario (sobrepeso, bajo peso, dolor lumbar), para gimnasios de estratos bajos. Tiene: web, app móvil y un ejecutable de escritorio (admin + consola de monitoreo).

## Lee antes de programar
- `docs/02_arquitectura.md` — requisitos, decisiones, contrato de la API, módulo de IA, monitoreo MAPE-K
- `database/schema.sql` — **fuente de verdad** del modelo de datos (MySQL 8). No cambies el esquema sin actualizar también el ER (`docs/diagramas/01_modelo_entidad_relacion.mmd`)
- `docs/diseno/` — pantallas exportadas de Claude Design; respeta colores, tipografías y componentes

## Stack (no cambiar sin consultar)
- Backend: Python 3.12, Flask (Blueprints), SQLAlchemy Core + PyMySQL, pydantic, Flask-JWT-Extended, APScheduler, Pandas, NumPy, pytest
- BD: MySQL 8 (en desarrollo también sirve MariaDB 10.6+)
- Web: React 18 + Vite + TypeScript + Tailwind + Recharts
- Móvil: Expo (React Native) + TypeScript + expo-router + expo-secure-store
- Escritorio: Electron + electron-builder (genera `FitIA Control.exe`), renderer en React
- Compartido: `packages/shared` (tipos, cliente API, tokens de diseño)

## Reglas
- **Costo $0 (restricción del equipo).** Solo software libre y capas gratuitas que no piden tarjeta. No agregues servicios, APIs, librerías ni hosting de pago. IA = Gemini gratis (AI Studio) o Mock.
- Todo el texto de la interfaz en español colombiano, con tuteo.
- La IA **nunca** decide sola: se le pasa el catálogo de `sp_ejercicios_seguros`, su respuesta pasa por `ValidadorSeguridad`, y el trigger `trg_rutina_ejercicio_seguro` es la última defensa. No quites ninguna de las tres capas.
- Los pagos son SIMULADOS: nunca integrar una pasarela real ni guardar el número completo de la tarjeta.
- Las API keys solo van en `backend/.env`. Nunca en los clientes.
- Proveedor de IA por `AI_PROVIDER` (`gemini` | `mock`). Todo debe funcionar con `mock` sin internet.
- Consultas SQL siempre parametrizadas.
- Cada endpoint nuevo: prueba en `backend/tests/` y fila en la tabla de la API de `docs/02_arquitectura.md`.
- Usuarios demo en `database/seed.sql` (admin@fitia.co / Admin2026*, laura@fitia.co / Demo2026*).

## Comandos
- BD: `mysql -u root -p < database/schema.sql && mysql -u root -p fitia < database/seed.sql`
- API: `cd backend && pip install -r requirements.txt && flask --app wsgi run --debug`
- Pruebas: `cd backend && pytest`
- Web: `cd apps/web && npm i && npm run dev`
- API en la WiFi (para el celular): `npm run api:lan` (sin `--debug`; firewall solo en perfil Privado)
- Móvil: `cd apps/mobile && npm i && npx expo start` (escanear con Expo Go). Va fuera de los workspaces de npm (React 19 vs. 18 de la web). Desbordes: `npm --prefix apps/mobile run revision`
- Escritorio: `cd apps/desktop && npm run dev` · instalador: `npm run dist`
- Todo junto: `docker compose up`
