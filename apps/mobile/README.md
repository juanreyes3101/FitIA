# FitIA — App móvil (Expo SDK 57 + TypeScript + expo-router)

App del usuario para el celular. Consume la misma API Flask (`/api/v1`) con el cliente de `packages/shared`. Es fiel a `docs/diseno/movil/` y `docs/diseno/comun/`. Plan de la etapa: `docs/plan_etapa5_movil.md`.

## Probar en el celular con Expo Go (misma WiFi)

1. **IP de la PC en la WiFi.** Sale con `ipconfig`: es el adaptador conectado al router del celular. En el equipo de desarrollo es **`192.168.0.10`**.
2. **Firewall, solo en el perfil Privado** (una vez):
   - En Configuración → Red e Internet → la red de la casa → **Tipo de perfil: Privada**.
   - En PowerShell **como administrador**:
     ```powershell
     New-NetFirewallRule -DisplayName "FitIA API y Expo" -Direction Inbound -Protocol TCP -LocalPort 5000,8081 -Action Allow -Profile Private
     ```
   - En redes públicas (cafés, la U) los puertos siguen cerrados, que es lo correcto. Allí usa el punto de acceso del celular y marca esa red como Privada.
3. **API escuchando en la red** (desde la raíz del repo): `npm run api:lan`.
   - Es `flask run --host 0.0.0.0 --port 5000`, **sin `--debug`**: el depurador de Werkzeug no debe quedar expuesto a la red.
   - Desde el navegador del celular, `http://192.168.0.10:5000/api/v1/health` debe responder `"estado":"OK"`.
4. **App:**
   ```bash
   cd apps/mobile
   npm install                      # una vez (tiene su propio node_modules, ver "Decisiones")
   copy .env.example .env           # EXPO_PUBLIC_API_URL=http://192.168.0.10:5000/api/v1
   npx expo start                   # escanea el QR con Expo Go (Android) o con la cámara (iPhone)
   ```
   Expo Go debe ser de la versión que soporta el **SDK 57**: la de la tienda siempre trae el último SDK.
5. Usuario demo: `laura@fitia.co` / `Demo2026*`.

### La IP depende de la red: revisa `apps/mobile/.env`

`192.168.0.10` es la IP de la PC **en la red "Hogar Valencia"**. En otra WiFi (la U, otra casa, el punto de acceso del celular) el router le da otra.
- **Antes de cada demo**, corre `ipconfig` y compara con `EXPO_PUBLIC_API_URL` en `apps/mobile/.env`.
- **Ojo:** si el `.env` tiene una IP vieja, **esa manda**. La app no conecta aunque Expo Go sí haya abierto.
- **Alternativa:** borra la línea del `.env`. Así la app usa la misma IP con la que Expo Go encontró a Metro (`Constants.expoConfig.hostUri`), con el puerto 5000.
- **Después de cambiar el `.env`**, reinicia con `npx expo start -c`: las variables `EXPO_PUBLIC_*` se fijan al armar el bundle.
- **Para el APK** la IP va en `eas.json`, que tiene la misma regla.

Si la app no llega a la API, muestra la pantalla "Sin conexión" con la dirección que intentó y un botón Reintentar. **No borra la sesión.**

## Scripts

| Comando | Qué hace |
|---|---|
| `npm start` | Metro + QR para Expo Go |
| `npm run web` | Vista web de Expo (http://localhost:8081), solo para revisar |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run revision` | Revisión de desbordes con Playwright a 360 px y 390 px (ver abajo) |
| `npx expo-doctor` | Revisa dependencias y configuración (21/21) |

**Revisión de desbordes** (`scripts/revision-visual.mjs`): necesita la API y `npm run web` corriendo. Recorre todas las pantallas como Laura y guarda capturas en `revision/{360,390}/`, que está ignorada en git. Es más estricta que la de la web, porque en React Native lo que se sale **no hace scroll: queda cortado**. Marca:
- los elementos que se salen de la pantalla o del contenedor que los recorta;
- el texto truncado con "…";
- las páginas en blanco (un bundle roto).

Exime los carruseles horizontales a propósito y los adornos con `aria-hidden`. Es una aproximación: la prueba final es en el celular.

## Pantallas

| Ruta | Pantalla | Endpoints |
|---|---|---|
| `/ingresar` | Login y registro (no hay diseño móvil: se adaptó el de la web) | `POST /auth/login`, `/auth/registro` |
| `/` (pestaña Hoy) | Entreno de hoy, racha, IMC, resumen y publicidad (solo Free) | `GET /perfil`, `/rutinas/activa`, `/progreso`, `/anuncios` |
| `/rutina` | Días, ejercicios y generar con IA | `GET /rutinas/activa`, `POST /rutinas/generar` |
| `/entreno` | Modo entreno a pantalla completa | `GET /rutinas/activa`, `POST /sesiones` |
| `/progreso` | Peso, IMC y adherencia (SVG, toca y desliza) y 6 logros | `GET /progreso?dias=365` |
| `/lumbar` | Rutina rápida de 10 min y biblioteca | `GET /ejercicios?lumbar=true`, `/ejercicios/seguros` |
| `/ejercicio/[id]` | Detalle | `GET /ejercicios`, `/rutinas/activa`, `/ejercicios/seguros` |
| `/imc` | Calculadora y guardar la medida | `GET /imc`, `POST /perfil/mediciones` |
| Hoja de planes | Pago simulado (tarjeta, PSE, Nequi) | `GET /planes`, `POST /pagos/simular` |
| `/perfil` | Datos, plan, molestias, vibración y descarga de datos | `GET/PUT /perfil` |
| `/onboarding` | 4 pasos + "La IA está armando tu rutina…" | `POST /perfil/mediciones`, `PUT /perfil`, `POST /rutinas/generar` |

Sin endpoints nuevos.

## Decisiones y desviaciones

- **Fuera de los workspaces de npm.**
  - Expo SDK 57 trae React 19 y la web usa React 18. Si fueran un solo workspace, npm podría dejar dos copias de React.
  - Por eso el `package.json` raíz lista `packages/*` y `apps/web`. `apps/mobile` tiene su propio `node_modules` y consume `"@fitia/shared": "file:../../packages/shared"`.
  - `metro.config.js` vigila `packages/shared` y resuelve solo desde `apps/mobile/node_modules`.
  - El plan proponía además `disableHierarchicalLookup`. No hizo falta: `shared` no importa paquetes, y así `expo-doctor` queda en verde.
- **Utilidades compartidas.** `dosis`, `minutosDia`, `diaDeHoy`, `racha`, etc. pasaron de `apps/web/src/lib/rutina.ts` a `packages/shared/src/rutina.ts`. El archivo de la web las re-exporta.
- **Tokens.** El access y el refresh viven en `expo-secure-store`, igual que el usuario (para restaurar la sesión) y la preferencia de vibración. En la vista web (solo para revisar) se cae a `localStorage`.
- **Relojes del modo entreno.** Se calculan con `Date.now()`, no contando ticks: si se bloquea la pantalla o la app pasa a segundo plano, el tiempo sigue bien. La pantalla no se apaga mientras entrena (`expo-keep-awake`).
- **Vibración.**
  - `expo-haptics` para los toques.
  - `Vibration` para los patrones: los últimos 3 s del descanso y el fin del descanso con `[220, 90, 220]`. iOS vibra una vez; Android respeta los tiempos.
  - Se apaga desde Perfil.
- **El botón atrás de Android** pausa el entreno en vez de salir.
- **Brechas del diseño, igual que en la web:**
  - **Racha y semana.** La API cuenta sesiones por semana, no por día. Por eso la tira de Hoy muestra la meta semanal (`dias_disponibles` cuadros), no días inventados. "¡Hoy ya cumpliste!" se guarda en el celular.
  - **Detalle de ejercicio.** No hay video, músculos secundarios ni errores comunes en la BD: hay un bloque duotono "Video próximamente" y se muestra el grupo muscular.
  - **Rutina rápida lumbar.** Son los primeros 5 de movilidad o estiramiento de `GET /ejercicios?lumbar=true`, a 1 × 2 min con 15 s de descanso. Se registra como sesión sin `rutina_dia_id`.
  - **Logros.** Se derivan de `/progreso?dias=365`. "IMC bajo 28" del diseño pasó a "IMC en rango normal", para que sirva a cualquier usuario.
  - **Perfil.** Cambiar la contraseña, borrar los datos, el modo claro y los recordatorios quedan *Próximamente*. "Descargar mis datos" arma el JSON con `GET /perfil`, `/rutinas/activa` y `/progreso` y lo comparte con la hoja nativa del celular.
- **Pagos simulados.**
  - El banner "Modo demostración" siempre está visible.
  - Solo viaja el número de tarjeta: Luhn se valida en el cliente y en el backend. El vencimiento, el CVV, el banco y el celular de Nequi **no se envían**.
  - Tarjetas de prueba: `4111 1111 1111 1111` se aprueba y `4242 4242 4242 0000` se rechaza.
- **Títulos Anton.** Llevan un hueco arriba para las tildes y un interlineado mayor cuando tienen Á, É, Í, Ó, Ú o Ñ. Si no, "DÍA" se veía como "DIA" y los acentos chocaban con la línea de arriba.
- **Letra grande del sistema.** Las cifras y los títulos aceptan hasta 1,3×, para que las rejillas no se rompan.

## Bug de iOS: `transform` nunca puede ser `undefined`

En iPhone (Expo Go, SDK 57) la app se caía con `TypeError: Cannot read property 'forEach' of null` en cada `Pressable`.
- **Causa:** el patrón `transform: pressed ? [{ translateY: 2 }] : undefined`. iOS nativo recorre `transform` como arreglo y revienta si queda `undefined` o `null`. En la vista web y en Android no fallaba, por eso la revisión automática no lo detectó.
- **Regla:**
  - `transform` siempre es un arreglo: `transform: [{ translateY: pressed ? 2 : 0 }]`.
  - Nada de `cond ? [...] : undefined` ni `cond && [...]`.
  - Lo mismo vale para cualquier estilo con forma de objeto o arreglo (`shadowOffset`, `textShadowOffset`).
- **Para revisarlo:** `grep -rnE "transform: *[^[]" src` no debe mostrar ningún `transform` que no empiece con `[`.

## APK (costo $0)

**Opción A: EAS, plan gratuito de Expo.** Necesita una cuenta gratis de Expo, sin tarjeta.
```bash
cd apps/mobile
npx eas-cli@latest login
npx eas-cli@latest build -p android --profile preview      # descarga el .apk desde el enlace que imprime
```
El perfil `preview` de `eas.json` genera un `.apk` instalable.
- Lleva `EXPO_PUBLIC_API_URL` en `env`, porque el `.env` no se sube: está en `.gitignore`. **Cambia esa IP si la PC de la demo es otra.**
- `app.json` activa `usesCleartextTraffic` (con `expo-build-properties`). Sin eso, Android bloquea `http://` en un APK de release, y la API de la LAN no tiene HTTPS.

**Opción B: 100 % local, con Android Studio** (gratis):
```bash
cd apps/mobile
npx expo prebuild -p android      # genera android/ (ignorada en git)
```
Abre `apps/mobile/android` en Android Studio → *Build → Build Bundle(s) / APK(s) → Build APK(s)*. Para un APK de release firmado, usa *Generate Signed Bundle / APK* con una llave propia (no la subas al repo).

**iOS:** no se empaqueta, porque exige la cuenta paga de Apple. En iPhone se prueba con Expo Go.
