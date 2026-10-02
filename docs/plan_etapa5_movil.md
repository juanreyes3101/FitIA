# Etapa 5: `apps/mobile` (Expo + TypeScript + expo-router)

> **Para una sesión nueva:** este plan ya fue aprobado. No vuelvas a preguntar las decisiones de la sección 2.
> El paso 0 es copiar este archivo a `docs/plan_etapa5_movil.md` (lo pidió el usuario). Sin subagentes.

## 1. Contexto
- El backend (Etapa 3, `40c4dfe`) y la web (Etapa 4, `e6e68e6`) ya funcionan. `packages/shared` ya trae los tipos, el cliente API con JWT y refresh (`crearClienteApi` + `AlmacenTokens`), los endpoints tipados, los mapeos y los tokens.
- Falta el cliente móvil. Lo pide la Etapa 5 de `docs/03_prompts_claude_code.md`: fiel a `docs/diseno/movil/` y `comun/`, JWT en `expo-secure-store`, prueba en el celular con Expo Go y por la WiFi, y EAS "preview" (APK) más la alternativa local.
- Reglas del pedido:
  - No inventar endpoints.
  - Sin subagentes.
  - La API debe escuchar en la IP de la PC en la red, no solo en localhost.
  - Revisar los mismos desbordes que tuvo la web.
- Orden de prioridad si se acaban los créditos:
  1. Login
  2. Hoy
  3. Rutina
  4. Modo entreno
  5. Progreso
  6. Lumbar
  7. IMC
  8. Planes
  9. Perfil

## 2. Decisiones (las tomo yo; son reversibles)
1. **`apps/mobile` queda fuera de los workspaces de npm.**
   - Problema: Expo (el SDK que Expo Go soporte hoy) trae React 19, y la web usa React 18. Con el hoisting de npm, Metro podría resolver el React 18 de la raíz y romper la app con dos copias de React.
   - Solución:
     - El `package.json` raíz pasa a `"workspaces": ["packages/*", "apps/web"]`.
     - `apps/mobile` tiene su propio `node_modules` y su `package-lock`, y consume `"@fitia/shared": "file:../../packages/shared"`.
     - En `metro.config.js`: `watchFolders` apunta a `packages/shared`, `nodeModulesPaths` solo a `apps/mobile/node_modules` y `disableHierarchicalLookup: true`.
   - `shared` no tiene dependencias, así que esto es seguro. La Etapa 6 (desktop) puede volver a unirse a los workspaces.
2. **Utilidades de rutina compartidas.**
   - `apps/web/src/lib/rutina.ts` es TS puro (`dosis`, `tiempo`, `minutosDia`, `seriesDia`, `semanaIso`, `diaDeHoy`, `racha`, `fechaCorta`, `hoyLargo`). Se mueve a `packages/shared/src/rutina.ts` y se exporta en `index.ts`.
   - El archivo de la web queda como una re-exportación de una línea, así que ningún import de la web cambia.
   - Se verifica con `npm -w apps/web run build`.
3. **No hay login en el diseño móvil.** Se adapta el `Ingresar` de la web al estilo móvil:
   - pestañas Ingresar / Crear cuenta
   - inputs de 60 px y CTA Anton con la sombra "golpe"
   - casillas de términos y datos
   - ADMIN o ENTRENADOR ven el mensaje "Usa FitIA Control"
   - Splash de Voltaje del diseño: `expo-splash-screen` más una animación corta de la marca.
4. **Brechas del diseño, igual que en la web** (sin endpoints nuevos):
   - Perfil: editar el nombre, cambiar la contraseña y borrar los datos quedan como *Próximamente*. "Descargar mis datos" arma el JSON con `GET /perfil`, `/rutinas/activa` y `/progreso` y lo comparte con `Share` de React Native, sin dependencias nuevas.
   - Detalle de ejercicio: no hay video, músculos ni errores en la BD. Se muestra un placeholder con duotono, `grupo` y `equipo`, el paso a paso sale de `instrucciones` y el "por qué" sale de las notas o de la explicación. La sección de errores se oculta.
   - Racha, tira de la semana y "entreno de hoy": se derivan de `adherencia_semanal` con `diaDeHoy` y `racha`.
   - Lumbar, "10 minutos para tu espalda": los 5 primeros de `GET /ejercicios?lumbar=true` de tipo MOVILIDAD o ESTIRAMIENTO, a 1 × 2 min. Al terminarla se hace `POST /sesiones` sin `rutina_dia_id` (el backend lo permite: `SesionEntrada.rutina_dia_id` es opcional).
   - Logros de Progreso: se derivan de `/progreso?dias=365`. Son 6:
     - primera sesión
     - 4 semanas seguidas
     - 8 semanas seguidas
     - −3 kg desde la primera medición
     - 25 sesiones
     - IMC en rango normal

     El diseño trae "IMC bajo 28", que solo aplica a Laura; se cambia por "IMC en rango normal" para que sirva a cualquier usuario.
   - Mapeos de la API: el diseño dice "Fuerte" y la API espera severidad 3. Las opciones de días (2–5) y de minutos (30/45/60/90) salen del diseño. El sexo es Mujer→`F` y Hombre→`M`. El lugar va siempre como `GIMNASIO`.
   - Recordatorios y "Probar notificación": se ven como *Próximamente*. Necesitarían `expo-notifications` y quedan fuera de la prioridad.
   - Vibración: el interruptor sí funciona y se guarda con secure-store.
   - Modo claro (solo en Hoy, según el diseño): va en el último bloque, si alcanza.
5. **Gráficas:** con `react-native-svg` dibujadas a mano, como el diseño (línea con área y barras con meta, y "toca y desliza" con `PanResponder`). No hay Recharts en React Native.
6. **Pagos:** solo viaja `numero_tarjeta`; vencimiento, CVV, banco y Nequi solo se validan en el cliente, como en la web. El banner "Modo demostración" siempre está visible.

## 3. Red: API en la IP de la PC
**Interfaces de la PC** (leído con `Get-NetIPAddress`):
- `Ethernet 3`, red "Hogar Valencia": **192.168.0.10/24**. Es una LAN privada de router doméstico, y el celular debe estar en la WiFi de ese mismo router.
- `Ethernet 2`: 192.14.12.17/23. No está en un rango privado; parece otra red, así que no se usa.
- Ambas redes están como **"Pública"** en Windows. El firewall bloquea las conexiones entrantes.

**IP a usar: `192.168.0.10`.** Esto queda así:
- `apps/mobile/.env`: `EXPO_PUBLIC_API_URL=http://192.168.0.10:5000/api/v1`. También se crea `.env.example` (`*.env` ya está en `.gitignore`).
- **Respaldo automático** en `src/api.ts`: si la variable falta, la URL se arma con el host de Metro (`Constants.expoConfig.hostUri`), que es la misma IP con la que Expo Go ya encontró la PC: `http://<host>:5000/api/v1`. Así, si cambia la IP, sigue funcionando.
- **API en la LAN:** `flask --app wsgi run --host 0.0.0.0 --port 5000`, **sin `--debug`**, porque el depurador de Werkzeug expuesto a la red es un riesgo. No hay cambios de código; se documenta en `backend/README.md` y se agrega el script raíz `"api:lan"`.
- No hace falta CORS para la app nativa. Para la vista web de Expo (revisión de desbordes), `CORS_ORIGINS` ya incluye `http://localhost:8081`.
- **Firewall (decisión del usuario: solo el perfil Privado).** El usuario marca "Hogar Valencia" como red **Privada** y corre, como administrador:
  `New-NetFirewallRule -DisplayName "FitIA API y Expo" -Direction Inbound -Protocol TCP -LocalPort 5000,8081 -Action Allow -Profile Private`
  **Nunca** se abre el perfil Public. Si la red sigue como Pública, la regla no aplica y el celular no conecta: es lo esperado.
- Prueba desde el celular: abrir en su navegador `http://192.168.0.10:5000/api/v1/health`.

## 4. Estructura
```
apps/mobile/
  package.json, app.json (nombre FitIA, esquema fitia, splash Voltaje, ícono, orientación vertical), eas.json,
  tsconfig.json (extiende expo/tsconfig.base; include ../../packages/shared/src), metro.config.js, babel.config.js,
  .env.example, README.md
  app/                         ← expo-router
    _layout.tsx                ← fuentes (Anton, Inter Tight, JetBrains Mono con @expo-google-fonts), SafeArea,
                                 SesionProvider, ToastProvider, PlanesSheetProvider y redirección según la sesión
    ingresar.tsx               ← login + registro
    onboarding.tsx             ← 4 pasos deslizables + "La IA está armando tu rutina…"
    (tabs)/_layout.tsx         ← tab bar del diseño: 68 px, pastilla Voltaje de 52×32, íconos SVG del diseño
    (tabs)/index.tsx           ← Hoy
    (tabs)/rutina.tsx, progreso.tsx, lumbar.tsx, perfil.tsx
    entreno.tsx                ← pantalla completa (presentation: fullScreenModal, sin tabs), ?lumbar=1
    ejercicio/[id].tsx, imc.tsx
  src/
    api.ts                     ← almacenSecureStore (AlmacenTokens) + crearClienteApi + crearEndpoints + URL
    sesion/SesionContext.tsx   ← la misma idea que la web: restaurar con refresh, login, registro, logout, perfil
    hooks/useDatos.ts          ← copia del de la web (carga, error y reintentar)
    ui/  Texto (Titulo Anton, Metrica JetBrains, Cuerpo), Boton (primario con golpe / secundario / fantasma),
         Campo, Selector (rejilla de opciones), Interruptor, Chip/Sello, MedidorImc, Estados (Cargando,
         Vacio, ErrorEstado con Reintentar), Toast, HojaInferior (Modal + Animated + arrastrar para cerrar),
         BannerAnuncio, Iconos (rutas SVG del diseño), Grafica (línea y barras)
    planes/HojaPlanes.tsx      ← elegir → pagar (Tarjeta/PSE/Nequi) → procesando → aprobado o rechazado
    lib/vibracion.ts           ← expo-haptics para los toques, Vibration para los patrones y preferencia guardada
```
**Dependencias** (todas libres y compatibles con Expo Go; se instalan con `npx expo install` para que coincidan con el SDK):
- expo-router, expo-secure-store, expo-haptics, expo-keep-awake, expo-splash-screen, expo-font, expo-constants
- @expo-google-fonts/anton, @expo-google-fonts/inter-tight, @expo-google-fonts/jetbrains-mono
- react-native-svg, react-native-safe-area-context, react-native-screens
- react-dom y react-native-web: solo para la revisión de desbordes en la vista web

## 5. Pasos (en el orden de prioridad)
**Paso 0.** Copiar este plan a `docs/plan_etapa5_movil.md`.

**Paso 1. Base:**
- `npx create-expo-app@latest apps/mobile --template blank-typescript`. Así sale el SDK vigente, el mismo que soporta Expo Go de la tienda; se confirma la versión con el usuario.
- Ajustes de los workspaces (decisión 1) y `metro.config.js`.
- Mover `rutina.ts` a shared (decisión 2) y verificar el build de la web.
- `api.ts` con secure-store (claves `fitia.access`, `fitia.refresh` y `fitia.usuario`), `SesionContext`, `useDatos` y los componentes de `ui/`.
- Verificar con `npx tsc --noEmit` y `npx expo start`.

**Paso 2. Red** (sección 3): `.env`, script `api:lan`, comando de firewall y prueba de `/health` desde el celular.

**Paso 3. Pantallas** (con estados de cargando, vacío y error con "Reintentar"; usuario no-USUARIO → aviso):

| # | Pantalla | Endpoints | Lo esencial |
|---|---|---|---|
| 1 | Ingresar | `POST /auth/login`, `/auth/registro` | Validación en vivo. Si no tiene perfil → onboarding; si no → Hoy. Al abrir la app, la sesión se restaura con el refresh. |
| 2 | Hoy | `GET /perfil`, `/rutinas/activa`, `/progreso?dias=60`, `/anuncios?ubicacion=BANNER_HOME` | Fecha `es-CO`. Tarjeta Voltaje "Día N · enfoque" con min, ejercicios y series. EMPEZAR y "Ver los N ejercicios". "¡Hoy ya cumpliste!" tras la sesión (estado local). Racha más la tira L–D. IMC → `/imc`. Resumen: peso, cupo IA (abre Planes) y espalda. Publicidad solo si `con_publicidad`. Sin rutina → CTA al onboarding. |
| 3 | Rutina | `GET /rutinas/activa`, `POST /rutinas/generar` | Origen (IA, base segura o caché). Selector de días con scroll horizontal (fijo arriba). Lista con número, dosis, descanso y sello "✓ Espalda" o "Cuida la postura". EMPEZAR DÍA N. Generar con cupo; con 402 → abre Planes. Toast "Rutina nueva lista". |
| 4 | Modo entreno | `GET /rutinas/activa`, `POST /sesiones` | Fases: serie → descanso → evaluación → "¡Sesión lista!" o "Cuidémonos". Cronómetro total y de descanso **calculado con `Date.now()`** (no se atrasa si la app pasa a segundo plano). `expo-keep-awake` mientras entrena. Anillo SVG. "+15 s" y "Saltar". Últimos 3 s → vibración corta; fin → patrón `[0,220,90,220]` más `Haptics.notificationAsync`; respeta el interruptor de vibración. Deslizar ← → entre ejercicios. Pausa (reanudar / terminar y evaluar / salir sin guardar). RPE 1–10 y dolor 0–10 con las etiquetas y colores del diseño; si falta uno, temblor y vibración. Envía `{rutina_dia_id, duracion_min, esfuerzo_percibido, dolor_reportado, completada, ejercicios[{ejercicio_id, series_hechas}]}`. Si `alerta_dolor` → pantalla "Cuidémonos" con movilidad sugerida y aviso médico. |
| 5 | Progreso | `GET /progreso?dias=90` (logros: `dias=365`) | Pestañas Peso / IMC / Adherencia. Valor seleccionado y delta. Gráfica SVG con "toca y desliza" (con vibración). Barras con meta = `dias_disponibles`. Ejes con `fechaCorta`. 6 logros derivados (decisión 4). Vacío: "Aún no hay datos". |
| 6 | Lumbar | `GET /ejercicios?lumbar=true`, `/ejercicios/seguros` | Tarjeta "10 minutos para tu espalda" → `entreno?lumbar=1`. Chips de tipo, interruptor "Solo seguros para mí" (intersección de ids) y conteo "N DE M". |
| 6b | Ejercicio | rutina activa o `GET /ejercicios` | Decisión 4. Botón volver. |
| 7 | IMC | `GET /imc`, `POST /perfil/mediciones` | Cálculo local en vivo con `clasificarImc`; −/+ y entrada decimal con coma. "GUARDAR MEDIDA" → medición (el trigger ajusta las condiciones) → toast → recarga el perfil. Rangos: 30–250 kg y 120–220 cm. |
| 8 | Planes (hoja inferior) | `GET /planes`, `POST /pagos/simular` | Precios de `PREMIUM_MES` y `PREMIUM_ANUAL` desde la API. Luhn en el cliente. Aviso "terminada en 0000 = rechazo". Aprobado → "¡Ya eres Pro!" con la `referencia` real y se recarga el perfil (se van los anuncios). Rechazado → "Intentar otra vez" o "Pagar con Nequi". Si ya es Pro → "Activo hasta …". |
| 9 | Perfil | `GET/PUT /perfil` | Avatar con iniciales, kg, cm e IMC, botón de plan → hoja. Molestias (PUT con las condiciones AUTORREPORTE, sin tocar las de IMC). Interruptor de vibración. Descargar datos. Próximamente: contraseña, borrar, recordatorios. Ley 1581. Cerrar sesión. |
| 10 | Onboarding | `POST /perfil/mediciones`, `PUT /perfil`, `POST /rutinas/generar` | 4 pasos con barra de segmentos y deslizar o SIGUIENTE. El nombre es de solo lectura (de la cuenta). Edad → `fecha_nacimiento` del 1 de enero. Animación de 5 ítems y "VER MI DÍA DE HOY". Con 402 → guarda el perfil y ofrece Pro. Con mock → aviso de "rutina base segura". |

Va al final porque no está en la lista de prioridad, pero se necesita para que un usuario nuevo pueda entrar.

**Paso 4. Desbordes** (los mismos de la web, traducidos a React Native):
- **Inputs con ancho intrínseco:** `TextInput` con `flex:1, minWidth:0` dentro de filas.
- **Pistas de grid sin `minmax(0,…)`:** en filas y rejillas, `flexBasis:0, flexGrow:1, minWidth:0` y `flexShrink:1` en los `Text`.
- **Cinta rotada y textos gigantes de fondo** ("02", "IMC", "10"): contenedor con `overflow:'hidden'`.
- **Títulos Anton largos** (p. ej. "Estiramiento de isquiotibiales" a 52 px): `adjustsFontSizeToFit` + `minimumFontScale`, o `numberOfLines`.
- **Accesibilidad:** `maxFontSizeMultiplier` (≈1.3) en cifras y títulos display, para que la letra grande del sistema no rompa las rejillas.
- **Safe areas** (notch y barra de gestos) y `KeyboardAvoidingView` en los formularios y en la hoja de planes.
- **Revisión automática:** `npm --prefix apps/mobile run revision`, que reusa la lógica de `apps/web/scripts/revision-visual.mjs` contra `npx expo start --web`:
  - mide 360 px (Android de gama baja, el público objetivo) y 390 px
  - recorre todas las rutas como Laura
  - nombra el elemento que desborda y guarda capturas en `apps/mobile/revision/` (agregado a `.gitignore`)
  - Sirve como aproximación. La prueba final es en el celular.

**Paso 5. APK y cierre:**
- `eas.json` con el perfil `preview` (`android.buildType: "apk"`, plan gratuito de Expo). El build no lo corro yo: requiere `eas login` con la cuenta del usuario.
- Documentar la alternativa 100 % local: `npx expo prebuild` + Android Studio → Build APK.
- `apps/mobile/README.md` con el arranque, la red, el firewall, las desviaciones, el APK e iOS solo con Expo Go.
- Fila de comandos en CLAUDE.md (`npm --prefix apps/mobile …`), porque cambia el comando de instalación.
- No hago commit hasta que el usuario lo pida.

## 6. Verificación
1. `cd backend && .venv\Scripts\python -m pytest` sigue en verde (no se toca el backend).
2. Web: `npm install` en la raíz y `npm -w apps/web run build`, sin errores (por el movimiento de `rutina.ts`).
3. Móvil: `npx tsc --noEmit -p apps/mobile` y `npx expo-doctor` sin errores.
4. API en la LAN (`api:lan`) → `curl http://192.168.0.10:5000/api/v1/health` desde la PC.
5. Vista web de Expo + `revision` a 360 y 390 px como Laura: 0 desbordes. Con Claude in Chrome se revisa el flujo de Laura (solo lectura):
   - login → Hoy con "Arranque seguro — espalda fuerte", IMC 28,65 y banner Free
   - Rutina → Ejercicio → Progreso (gráfica de 3 mediciones) → Lumbar con "Solo seguros"
   - Planes: tarjeta terminada en 0000 → RECHAZADO
6. **En el celular con Expo Go** (lo hace el usuario; le dejo los pasos y le pido capturas):
   - firewall → `npx expo start` → escanear el QR
   - Laura: login y navegación por todas las pestañas
   - con un usuario de prueba `movil_demo_<fecha>@pruebas.fitia.co`: registro → onboarding → rutina → modo entreno completo
   - verificar que vibra al terminar el descanso, que el tiempo sigue bien al bloquear y desbloquear, y que con dolor 7 sale "Cuidémonos"
   - pagar Pro con `4111 1111 1111 1111` → APROBADO y sin anuncios
   - cerrar la app y abrirla → la sesión se restaura
7. Al final, preguntar antes de borrar al usuario de prueba (`DELETE FROM usuarios WHERE email LIKE 'movil_demo_%@pruebas.fitia.co'`).

## 7. Riesgos
- **Versión de Expo Go:** solo corre el SDK más reciente. Por eso se usa `create-expo-app@latest` y se compara con la versión que muestra Expo Go en el celular.
- **Red:** que la red no quede marcada como Privada (la regla solo aplica allí), o aislamiento de clientes en el router (algunas WiFi de invitados lo tienen). Si el celular no llega a `/health`, se prueba con el hotspot del celular conectado a la PC. Expo `--tunnel` no sirve aquí, porque solo tunela Metro, no la API.
- **Rate-limit de login (5/min por IP):** en la verificación no hay que repetir el login a lo loco.
- **Créditos:** se sigue estrictamente el orden del paso 3, y cada pantalla terminada queda usable por sí sola.

## 8. Lo que cambió al implementar
- **Expo SDK 57** (React 19.2, React Native 0.86). Las rutas viven en `apps/mobile/src/app/`: es la convención de la plantilla de este SDK.
- **`metro.config.js` sin `disableHierarchicalLookup`.** `expo-doctor` lo marcaba, y no hace falta: `apps/mobile` tiene su árbol completo y `packages/shared` no importa paquetes. `npm ls react` da una sola copia (19.2.3), y con eso `expo-doctor` queda en 21/21.
- **Dependencias extra, gratis:**
  - `expo-asset`, que la exige `expo-font` en web.
  - `expo-build-properties`, para `usesCleartextTraffic`. Sin eso, el APK de release no podría hablar con la API de la LAN por `http://`.
- **El "10 minutos" de la rutina lumbar cuenta solo el trabajo** (5 × 2 min); los descansos de 15 s van aparte.
- **La revisión de desbordes es más estricta que la de la web.** También marca el texto truncado con "…", los elementos cortados por un contenedor y las pantallas en blanco. Encontró y se corrigieron:
  - tildes recortadas en títulos Anton ("DÍA" → "DIA")
  - el IMC truncado en la tarjeta de Hoy
  - el tipo de ejercicio y el grupo truncados en Lumbar
  - el título "Calculadora IMC"
- **`useKeepAwake` se cambió** por activar y desactivar a mano, ignorando los errores: en la web lanzaba una excepción al salir del entreno.
- **Bug de iOS (lo encontró el usuario en su iPhone).**
  - Síntoma: con `transform: pressed ? [...] : undefined`, la app se caía con `Cannot read property 'forEach' of null` en cada `Pressable`.
  - Arreglo: los 12 `transform` condicionales pasaron a ser siempre un arreglo (`[{ translateY: pressed ? 2 : 0 }]`). No había `shadowOffset` ni estilos con `&&`.
  - La regla quedó en `apps/mobile/README.md`.
  - La vista web y la revisión automática no lo detectan: solo se ve en iOS nativo.

## 9. Estado al cierre (2026-10-02)

**Hecho y verificado:**
- **App en iPhone:** las 10 pantallas, conectadas a la API real sin endpoints nuevos, funcionan con Expo Go (SDK 57), probadas por el usuario.
- **Vista web de Expo** (Playwright):
  - 0 desbordes ni textos cortados a 360 y 390 px.
  - Flujo completo con un usuario de prueba: registro → onboarding → rutina mock → modo entreno → el descanso cuenta hacia atrás y "+15 s" funciona → no se puede guardar sin RPE y dolor → con dolor 7 sale "Cuidémonos" → pago rechazado (0000) → pago aprobado → Hoy sin publicidad.
- **Pruebas y builds:**
  - `pytest`: 55 pruebas en verde.
  - `npm -w apps/web run build` y `tsc --noEmit` del móvil: sin errores.
  - `expo-doctor`: 21/21.
  - `expo export -p android`: compila.
- **Datos:** se borraron los usuarios de prueba `movil_demo_%@pruebas.fitia.co`. Los datos de Laura no se tocaron.

**Pendiente:**
- **En el celular:** probar que vibre (los últimos 3 s y el fin del descanso, en Android y en iPhone), que el tiempo no se atrase al bloquear y desbloquear la pantalla durante el descanso, y que la sesión se restaure al cerrar y abrir la app.
- **APK:** generarlo con `npx eas-cli@latest build -p android --profile preview` (cuenta gratis de Expo) o con `npx expo prebuild` + Android Studio. Antes, revisar la IP de `eas.json`.
- **Antes de cada demo:** confirmar la IP de la PC en la red del momento contra `apps/mobile/.env` (ver `apps/mobile/README.md`).
- **"Próximamente" en Perfil:** cambiar contraseña, borrar datos, modo claro y recordatorios.
- **`npm audit`** en `apps/mobile` reporta 16 avisos (12 moderados, 4 altos) en dependencias de Expo. No se revisaron.
