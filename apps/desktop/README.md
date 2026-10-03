# FitIA Control (escritorio · Electron + React)

Consola de administración y monitoreo MAPE-K para el equipo (rol ADMIN; el ENTRENADOR solo ve Entrenadores y Configuración). Usa el cliente, los tipos y los tokens de `packages/shared` y la misma API (`/api/v1`). Diseño: `docs/diseno/escritorio/`.

## Arranque (desarrollo)

```bash
# Desde la raíz del repo (apps/desktop está en los workspaces de npm, React 18 como la web)
npm install
node node_modules/electron/install.js   # solo si falta node_modules/electron/dist (npm a veces no corre el postinstall)

npm run api:lan     # o: cd backend && .venv\Scripts\flask --app wsgi run
npm run worker      # worker MAPE-K, en otra terminal (para la demo: MONITOR_INTERVAL_SEG=15 en backend/.env)
npm run desktop     # Vite en :5174 + tsc -w del proceso principal + Electron con DevTools
```

- `CORS_ORIGINS` en `backend/.env` debe incluir `http://localhost:5174` (desarrollo) y `app://fitia` (app instalada).
- Demo: `admin@fitia.co` / `Admin2026*`.
- **URL de la API configurable:** en el login ("Servidor") o en Configuración. Por defecto es `http://localhost:5000/api/v1`. Antes de guardarla se prueba con `GET /health` y queda en `%APPDATA%\FitIA Control\config.json`.

## Instalador (costo $0)

```bash
npm run desktop:dist      # = npm -w apps/desktop run dist → apps/desktop/release/FitIA Control Setup.exe
npm -w apps/desktop run icono   # regenera recursos/icon.png desde el logo (Playwright)
```

- NSIS por usuario, con la opción de elegir la carpeta.
- **Sin firma de código**, así que Windows SmartScreen avisa la primera vez: "Más información" → "Ejecutar de todas formas".
- `electronVersion` va fija en `electron-builder.yml`: con los workspaces, electron vive en la raíz y electron-builder no deduce la versión a partir de un rango.
- No se empaqueta `node_modules`: Vite ya empaqueta el renderer, y el proceso principal solo usa Electron y Node.

## Revisión automática

```bash
npm -w apps/desktop run build
npm -w apps/desktop run revision           # todas las pantallas a 1366×768 y 1920×1080: desbordes + capturas
npm -w apps/desktop run revision -- --pico # además: "Simular pico" → INCIDENTE ABIERTO → CERRADO (necesita el worker)
```

Las capturas quedan en `apps/desktop/revision/` (ignorada en git). Entra **una sola vez** porque el login tiene un límite de 5 intentos por minuto.

## Seguridad

- `contextIsolation`, `sandbox` y sin `nodeIntegration`. El renderer solo ve `window.fitia` (`electron/preload.ts`): ventana, URL de la API, sesión y "Guardar como".
- En producción el renderer se sirve con el protocolo propio `app://fitia`, con CSP. No se puede navegar fuera de la app; los enlaces externos se abren en el navegador.
- El access token vive en memoria. El refresh token se guarda **cifrado con `safeStorage`** (DPAPI de Windows) en `%APPDATA%\FitIA Control\sesion.bin`. Cerrar sesión lo borra.
- Las llaves de la IA no pasan por aquí: siguen solo en `backend/.env`.

## Pantallas

| Pantalla | Endpoints |
|---|---|
| Ingreso | `POST /auth/login`, `/auth/refresh`, `GET /health` (probar servidor) |
| Monitoreo (sondeo cada 5 s) | `GET /monitoreo/servicios`, `/monitoreo/estado`, `/monitoreo/metricas?paso=10s\|30s`, `/monitoreo/anomalias`, `/monitoreo/acciones`, `POST /monitoreo/simular-pico` |
| Resumen | `GET /admin/usuarios`, `/reportes/uso-ia`, `/reportes/ingresos`, `/monitoreo/anomalias`, `/monitoreo/acciones` |
| Usuarios | `GET/POST /admin/usuarios`, `PUT /admin/usuarios/{id}` |
| Ejercicios y matriz | CRUD `/admin/ejercicios`, `GET /ejercicios`, `GET /admin/condiciones`, `GET/POST/DELETE /admin/contraindicaciones` |
| Entrenadores | `GET /entrenador/rutinas-pendientes`, `PATCH /entrenador/rutinas/{id}`, `GET /admin/usuarios?rol=ENTRENADOR` |
| Planes y anuncios | `GET/PUT /admin/planes`, `GET/POST/PUT /admin/anuncios` |
| Reportes | `GET /reportes/{ingresos\|uso-ia\|adherencia}` (JSON y `?formato=csv`) |
| Configuración | `GET /monitoreo/estado`, `/monitoreo/servicios` |

## Desviaciones del diseño (sin endpoints inventados)

- **Login sin 2FA:** el backend no lo tiene.
- **"DATOS SIMULADOS" → "REMEDIACIÓN SIMULADA":** las métricas son reales; el escalado y los reinicios son simulados.
- **Monitoreo:**
  - La gráfica muestra los últimos 15 min, no 90 s, porque el worker corre cada `MONITOR_INTERVAL_SEG`.
  - La banda μ ± 3σ es la línea base guardada (Knowledge, `/monitoreo/estado`), como la franja horizontal del diseño.
  - La CPU y la memoria son del equipo donde corre el worker (`psutil`).
- **Resumen:**
  - "Costo est." = $0 (capa gratuita).
  - "Rutinas por hora" → **rutinas por día (14 días)**, porque `uso-ia` es diario.
  - "Actividad reciente" = las últimas remediaciones del monitor.
- **Usuarios:** no hay datos de gimnasio, entrenador asignado, adherencia ni dolor por usuario. La ficha muestra peso, IMC, fecha de alta, plan y teléfono.
- **Matriz:** la BD es binaria (la fila existe o no), así que hay 2 estados, **APTO / NO**, sin "Precaución". Marcar NO pide el motivo, que la API exige.
- **Entrenadores:**
  - La cola no trae el detalle de la rutina, así que "Ajustar" guarda una nota (`AJUSTAR`) sin cambiar ejercicios. Rechazar exige el motivo.
  - No hay métricas por entrenador (asignados, tiempo de revisión).
- **Planes:** se editan el precio y el estado activo. "Borrar" un anuncio es pausarlo (la API hace borrado lógico).
- **Reportes:** sin "Exportar PDF". El CSV lo genera el backend (Pandas) y se guarda con el diálogo nativo, con BOM para que Excel lea bien las tildes.
- **Configuración:** el detector y las políticas son de solo lectura (vienen de `backend/.env` y de la tabla `servicios`); editarlos queda como *Próximamente*. La URL de la API sí se edita.
