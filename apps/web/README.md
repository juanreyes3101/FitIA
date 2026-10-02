# FitIA — Web (React + Vite + TypeScript + Tailwind)

Sitio público y app del usuario. Consume la API Flask (`/api/v1`) con el cliente de `packages/shared`.

## Arranque

```bash
# 1. API (otra terminal)
cd backend && .venv\Scripts\flask --app wsgi run

# 2. Web (desde la raíz del repo: los workspaces de npm enlazan packages/shared)
npm install
copy apps\web\.env.example apps\web\.env     # VITE_API_URL=http://localhost:5000/api/v1
npm run web                                  # http://localhost:5173
```

- `npm -w apps/web run build`: typecheck (`tsc --noEmit`) + build de producción en `apps/web/dist`.
- `npm -w apps/web run revision`: revisión visual con Playwright. Con la web y la API corriendo, recorre todas las rutas (públicas y la app como laura@fitia.co) en 390 px y 1440 px. Detecta desbordes horizontales (`scrollWidth > ancho`) y nombra el elemento que los causa, midiendo sin el `overflow-x: clip` de respaldo del body. Guarda capturas en `apps/web/revision/{390,1440}/` (ignoradas en git). Sale con código 1 si hay desbordes. La primera vez: `npx -w apps/web playwright install chromium`.
- `CORS_ORIGINS` en `backend/.env` debe incluir `http://localhost:5173`.
- Usuario demo: `laura@fitia.co` / `Demo2026*`. Admin y entrenador usan FitIA Control (escritorio): la web les muestra ese aviso.

## Rutas

| Ruta | Pantalla | Endpoints |
|---|---|---|
| `/` | Inicio (landing) | `GET /planes` |
| `/imc` | Calculadora IMC | `GET /imc` |
| `/planes` | Planes y comparación | `GET /planes` |
| `/nosotros` | Sobre nosotros | — |
| `/ingresar`, `/ingresar#registro` | Login y registro | `POST /auth/login`, `POST /auth/registro` |
| `/app/onboarding` | 4 pasos + generación | `POST /perfil/mediciones`, `PUT /perfil`, `POST /rutinas/generar` |
| `/app` | Dashboard | `GET /perfil`, `/rutinas/activa`, `/progreso`, `/anuncios` |
| `/app/rutina` | Mi rutina | `GET /rutinas/activa`, `POST /rutinas/generar` |
| `/app/ejercicio/:id` | Detalle de ejercicio | `GET /ejercicios`, `/rutinas/activa` |
| `/app/entreno` | Modo entreno | `GET /rutinas/activa`, `POST /sesiones`, `/anuncios` |
| `/app/progreso` | Progreso (Recharts) | `GET /progreso?dias=30\|90\|365` |
| `/app/planes` | Planes con pago simulado | `GET /planes`, `POST /pagos/simular` |
| `/app/lumbar` | Biblioteca lumbar | `GET /ejercicios?lumbar=true`, `/ejercicios/seguros` |
| `/app/perfil` | Perfil | `GET/PUT /perfil`, `POST /perfil/mediciones` |

## Decisiones y desviaciones

- **Tokens**: el access token vive solo en memoria. El backend entrega el refresh en el cuerpo (no en una cookie httpOnly como dice la §8 de la arquitectura), así que la web lo guarda en `localStorage` para sobrevivir a recargar la página. El cliente de `packages/shared` hace refresh automático ante un 401 y repite la petición una vez.
- **Sin endpoints inventados**. Lo que el diseño muestra y la API no tiene:
  - Editar nombre, correo y celular, cambiar contraseña, borrar datos y "Volver a Free" se ven deshabilitados con la etiqueta *Próximamente*.
  - "Descargar mis datos" (Ley 1581) sí funciona: arma un JSON en el navegador con `GET /perfil`, `/rutinas/activa` y `/progreso`.
  - Detalle de ejercicio: no hay músculos secundarios, errores comunes ni video en la BD. Se muestra el grupo muscular, el "paso a paso" sale de `instrucciones` y "por qué" sale de las notas de la rutina o del sello lumbar.
  - "Entreno de hoy", la racha y la tira de la semana se derivan de `adherencia_semanal` (sesiones por semana), porque no hay historial de sesiones por día.
- **Registro**: la API exige `apellidos`, así que el formulario suma ese campo. Las dos casillas obligatorias (términos y datos) mandan `acepta_terminos=true`. Edad y sexo se piden en el paso 1 del onboarding y viajan en `PUT /perfil` (`fecha_nacimiento` aproximada al 1 de enero).
- **Pagos simulados**: banner fijo "Modo demostración". Solo viaja el número de tarjeta (el backend valida Luhn y guarda los últimos 4). Nombre, vencimiento, CVV y los datos de PSE o Nequi se validan en el cliente y **nunca se envían**. Tarjetas de prueba: `4111 1111 1111 1111` se aprueba y `4242 4242 4242 0000` se rechaza.
- **Publicidad**: solo en el plan Free (`plan.con_publicidad`). En Pro no se pide `GET /anuncios`.
- **Proveedor Mock**: si la rutina viene con `proveedor: "mock"`, se avisa que es una "rutina base segura" armada por reglas.
- La app del usuario se carga con `React.lazy`. Así el sitio público no descarga Recharts (unos 78 kB gzip contra unos 185 kB).
