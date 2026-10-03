# Etapa 6: monitoreo autónomo MAPE-K + `apps/desktop` (FitIA Control)

> **Para una sesión nueva:** este plan ya fue aprobado. No vuelvas a preguntar las decisiones de la sección 2.
> El paso 0 es copiar este archivo a `docs/plan_etapa6_desktop.md` (lo pidió el usuario). Sin subagentes. Sin commit hasta que lo pida.

## 1. Contexto
- Backend (Etapa 3), web (Etapa 4) y móvil (Etapa 5, `53afc5f`) ya funcionan. Del monitoreo solo existe la fase **Monitor**: el middleware `app/middleware/metricas.py` (latencia y 0/1 de error por petición, en lote cada 10 s), la banda al vuelo de `app/monitoring/banda.py` (EWMA α=0.3 ± **2σ**) y `simulador.py` (`generar_pico`, que solo escribe en `metricas`).
- Las tablas `lineas_base`, `anomalias` y `acciones_remediacion`, el trigger `trg_anomalia_resuelta` (pone `resuelta_en`) y la vista `v_salud_servicios` ya existen en `schema.sql`. **No se toca el esquema** (el ER no cambia).
- Falta: el ciclo Analizar → Planificar → Ejecutar → Verificar en un worker aparte, que "Simular pico" dispare el ciclo completo para la demo, y la consola de escritorio fiel a `docs/diseno/escritorio/`.
- Prioridad de la parte B si se acaban los créditos: (1) Login + Monitoreo, (2) Resumen, Usuarios, Matriz de contraindicaciones, (3) Entrenadores, Planes y anuncios, Reportes (CSV), Configuración.

## 2. Decisiones (las tomo yo, salvo la 7 que eligió el usuario; son reversibles)
1. **El "valor actual" y la línea base no se mezclan.** Valor actual x = media de las muestras de los últimos `MONITOR_INTERVAL_SEG`. Línea base = muestras de `[ahora − MONITOR_VENTANA_MIN, ahora − intervalo]`, remuestreadas a 1 min, EWMA α=0.3 (μ = último valor) y desviación (σ) de la ventana, más p95 → fila en `lineas_base`. **Se excluyen los tramos de anomalías ya detectadas** de esa métrica (la línea base no "aprende" del incidente). Mínimo 10 muestras; σ con piso (`max(σ, 1 % de μ, 1e-3)`) para no dividir por cero.
2. **Detección de un solo lado:** anomalía si z > 3 (o `TASA_ERROR` > 5 %). La arquitectura dice |z| > 3, pero una latencia, un error o una CPU **bajos** no son un problema (y el tráfico real de la consola, de ~10 ms, caería siempre "por debajo" de una base sintética de 120 ms). Severidad: 3–4σ BAJA, 4–5σ MEDIA, > 5σ ALTA; `TASA_ERROR` ≥ 50 % → CRÍTICA. **Una sola anomalía ABIERTA por (servicio, métrica):** mientras esté abierta no se crean duplicados.
3. **Verificación con la base guardada (Knowledge):** en cada ciclo, para cada anomalía ABIERTA se toma su `linea_base_id`; si x ≤ μ + 3σ → `MITIGADA` (el trigger pone `resuelta_en`) y el servicio vuelve a `SALUDABLE`. Sin muestras en el intervalo no hay evidencia → sigue ABIERTA.
4. **Políticas (`politicas.py`, tabla de reglas puras):**
   | Condición | Acción |
   |---|---|
   | LATENCIA_MS o RPS o CPU_PCT alta en `api`/`web` y réplicas < máx | `ESCALAR_ARRIBA` (+1) |
   | Lo mismo con réplicas = máx | `NOTIFICAR_ADMIN` |
   | LATENCIA_MS o TASA_ERROR alta en `ia` | `CAMBIAR_PROVEEDOR_IA` (Mock) |
   | TASA_ERROR alta en `api` | `REINICIAR_WORKER` (simulado) |
   | Severidad CRÍTICA | además `NOTIFICAR_ADMIN` |
   | Anomalía MITIGADA, sin anomalías abiertas en el servicio, réplicas > réplicas antes del incidente y pasó el enfriamiento | `ESCALAR_ABAJO` (−1), ligada a esa anomalía |
   - **Enfriamiento** `MONITOR_ENFRIAMIENTO_SEG` (300 por defecto) por servicio, salvo `NOTIFICAR_ADMIN`. Siempre dentro de `replicas_min`/`replicas_max`.
   - **El "RPS bajo 15 min → escalar abajo" sin anomalía no se implementa:** `acciones_remediacion.anomalia_id` es NOT NULL y no se cambia el esquema. Por eso el escalado hacia abajo devuelve las réplicas al nivel previo al incidente (como la bitácora del diseño).
5. **Ejecutar (simulado):** actualiza `servicios.replicas_actuales` y `servicios.estado` (`DEGRADADO` con anomalía abierta) y escribe en `acciones_remediacion` (`replicas_antes/despues`, `detalle` con el texto del plan, `resultado = EXITOSA`).
   - **IA a Mock entre procesos:** el worker no comparte memoria con la API. `rutinas._elegir_proveedor` consulta `repo.ia_forzada_a_mock(conn)`: hay una acción `CAMBIAR_PROVEEDOR_IA` cuya anomalía sigue ABIERTA → usa Mock. Al quedar MITIGADA, vuelve a Gemini. El circuit breaker en memoria se queda como está (las 3 capas de seguridad no se tocan).
6. **Monitor del worker:** además de lo que deja el middleware, cada ciclo inserta `RPS` por servicio (muestras de latencia / intervalo), `CPU_PCT` y `MEM_PCT` del equipo con **psutil** (BSD, gratis; nueva dependencia) asignados a `api`, y `TASA_ERROR` de `ia` desde `solicitudes_ia` (errores / total de Gemini en el intervalo), porque si Gemini falla la API pasa a Mock sin devolver 5xx. Como CPU y memoria se miden siempre, cada ciclo deja al menos una `lineas_base` → sirve de latido del worker.
7. **(Elegida por el usuario) `GET /admin/condiciones`**, de solo lectura, para las columnas de la matriz.
8. **Otros cambios mínimos de API** (todos con prueba y fila o nota en la tabla de la §4):
   - `GET /monitoreo/estado` (nuevo, admin): `{intervalo_seg, umbral_z, ventana_min, enfriamiento_seg, worker: {ultimo_ciclo, activo}, ia: {configurado, efectivo, circuit_breaker}, lineas_base: [última por servicio y métrica]}`. Alimenta la cabecera ("IA: Gemini/Mock"), el "UMBRAL z > 3 · VENTANA" y la caja "K · LÍNEA BASE".
   - `GET /monitoreo/metricas`: nuevo parámetro opcional `paso` (`10s` | `30s` | `1min`, por defecto `1min`) para la gráfica en vivo; la banda pasa a **± 3σ** (como la arquitectura y el diseño).
   - `GET /monitoreo/servicios`: suma `replicas_min` y `replicas_max` (join con `servicios`; la vista no se toca).
   - `GET /admin/usuarios`: suma `imc`, `clasificacion_imc` y `plan` (join con `v_usuario_resumen`), para la dona del Resumen y la tabla de Usuarios.
   - `POST /monitoreo/simular-pico`: **inserta y corre el ciclo MAPE-K en el acto** (solo para ese servicio) y devuelve también `ciclo: {anomalias, acciones}`. La verificación (MITIGADA) la hace el worker en su ciclo siguiente.
9. **Simulador:** el pico ocupa solo el último intervalo (`max(2, intervalo // 10)` muestras cada 10 s) para que la línea base quede limpia. Si la métrica ya tiene ≥ 30 muestras reales en la ventana, el pico se calcula sobre esa base real (`max(μ·factor, μ + 6σ)`) y no se rellena historia; si no, rellena `minutos` de historia sintética como hoy (la prueba actual de 60 muestras sigue valiendo).
10. **Concurrencia:** el ciclo corre dentro de `GET_LOCK('fitia_mape_k', 5)` de MySQL, así el worker y `simular-pico` nunca crean la misma anomalía dos veces.
11. **Escritorio en los workspaces** (`"apps/desktop"` en el `package.json` raíz; React 18 como la web). Vite + React + TS + Tailwind con los tokens de shared + Recharts. Fuentes locales con `@fontsource` (Anton, Inter Tight, JetBrains Mono) para que funcione sin internet.
12. **Seguridad de Electron:** `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, preload mínimo (`window.fitia`). Ventana sin marco con la barra de título del diseño (minimizar, maximizar y cerrar por IPC). En producción el renderer se sirve con un protocolo propio `app://fitia` → se agregan `app://fitia` y `http://localhost:5174` (Vite del escritorio) a `CORS_ORIGINS`.
13. **Tokens y configuración:** access en memoria; refresh cifrado con `safeStorage` de Electron (DPAPI en Windows) en `userData`. **URL de la API configurable** (por defecto `http://localhost:5000/api/v1`) en `userData/config.json`, editable desde el login ("Servidor") y Configuración. Si `window.fitia` no existe (renderer abierto en un navegador para revisión), cae a `localStorage`.
14. **Brechas del diseño (sin inventar endpoints):**
    - Login: sin campo 2FA (el backend no lo tiene); demo `admin@fitia.co · Admin2026*`. ENTRENADOR solo ve Entrenadores; USUARIO → "Usa la app FitIA".
    - Etiqueta "DATOS SIMULADOS" → **"REMEDIACIÓN SIMULADA"** (las métricas son reales; el escalado no).
    - Monitoreo: el eje es de los últimos 15 min (no −90 s); el umbral y la ventana salen de `/monitoreo/estado`.
    - Resumen: "Tokens" y "Costo est." salen de `/reportes/uso-ia` si traen datos, si no se ocultan (Gemini gratis = $0). "Rutinas por hora" → **"Rutinas por día (14 días)"** (`uso-ia` es diario). "Actividad reciente" = últimas anomalías y acciones.
    - Matriz: la BD es binaria (existe o no la fila) → 2 estados, **APTO / NO** (sin "Precaución"). Clic en NO pide el motivo (obligatorio en la API).
    - Configuración: URL de la API editable; detector y políticas de solo lectura (vienen del `.env`); editarlas → *Próximamente*.
15. **Instalador:** electron-builder, NSIS, `productName: "FitIA Control"` → `FitIA Control Setup.exe`, sin firma (Windows SmartScreen avisará: se documenta "Más información → Ejecutar de todas formas"). Ícono: PNG de 512 px generado desde el SVG del logo con Playwright (ya está en la web).

## 3. Estructura
```
backend/app/monitoring/
  analisis.py     ← puro (Pandas): linea_base(), valor_actual(), zscore(), severidad(), detectar()
  politicas.py    ← puro: POLITICAS + planificar(anomalia, servicio, ultima_accion_en, ahora, cfg) con enfriamiento y límites
  mape_k.py       ← ejecutar_ciclo(conn, ahora=None, servicios=None) → monitor, analizar, planificar, ejecutar, verificar (con GET_LOCK)
  worker.py       ← python -m app.monitoring.worker: create_app(sin scheduler) + BlockingScheduler cada MONITOR_INTERVAL_SEG (primera corrida inmediata)
  banda.py, simulador.py  ← ajustes de las decisiones 8 y 9
backend/app/repositories/monitoreo.py  ← + ventana de muestras, lineas_base, anomalías abiertas, acciones, servicios, ia_forzada_a_mock, condiciones
backend/app/api/monitoreo.py, admin/condiciones.py (nuevo), admin/__init__.py, repositories/usuarios.py, services/rutinas.py
backend/app/config.py  ← MONITOR_ENFRIAMIENTO_SEG=300, MONITOR_Z=3
backend/tests/test_mape_k.py (nuevo)
packages/shared/src/  tipos.ts (+ Servicio, Metricas, Anomalia, Accion, EstadoMonitor, UsuarioAdmin, Condicion, Contraindicacion, Reporte…),
                      endpointsAdmin.ts (nuevo: monitoreo, admin, reportes, entrenador), cliente.ts (+ opción respuesta: 'texto' para CSV)
apps/desktop/
  package.json (@fitia/desktop; dev = vite :5174 + tsc -w + electron con concurrently y wait-on), electron-builder.yml, vite.config.ts,
  tailwind.config.ts (tokens de shared), tsconfig*.json, scripts/icono.mjs, scripts/revision.mjs (Playwright _electron, 1366×768 y 1920×1080), README.md
  electron/main.ts      ← ventana sin marco, protocolo app://, IPC: ventana, config (URL API), tokens (safeStorage), guardar CSV (dialog)
  electron/preload.ts   ← contextBridge window.fitia
  src/ main.tsx, App.tsx (rutas por hash como el diseño), api.ts (almacén + cliente), sesion/SesionContext.tsx, hooks/useDatos.ts, hooks/usePolling.ts
  src/shell/  BarraTitulo, Lateral (8 ítems e íconos del diseño, punto vivo en Monitoreo), Cabecera (estado global, IA, réplicas y p95, reloj), Toasts
  src/pantallas/ Login, Monitoreo, Resumen, Usuarios, Ejercicios (lista + matriz), Entrenadores, Planes, Reportes, Configuracion
  src/ui/ Tarjeta, Pastilla, Boton (con "golpe"), Campo, Estados (cargando, vacío, error con Reintentar), Sparkline
```

## 4. Pasos (en orden; cada bloque queda usable por sí solo)
**Paso 0.** Copiar este plan a `docs/plan_etapa6_desktop.md`.

**Paso 1. Parte A, backend** (decisiones 1–10):
- `analisis.py` y `politicas.py` puros primero, con sus pruebas unitarias; luego `mape_k.py`, `worker.py` y los cambios de API y repositorios.
- `psutil` en `requirements.txt`; `MONITOR_ENFRIAMIENTO_SEG` y `MONITOR_Z` en `.env.example` (y para la demo se recomienda `MONITOR_INTERVAL_SEG=15`).
- Pruebas en `tests/test_mape_k.py` (servicio `web`, sin tráfico real; el `finally` borra sus métricas, líneas base, anomalías y acciones y deja réplicas = 1 y `SALUDABLE`; el tiempo se controla con `ahora=`):
  1. Serie normal (30 min, semilla fija) → ciclo → **0 anomalías**.
  2. Pico en el último intervalo a μ + 6σ → ciclo → **1 anomalía ALTA** y **1 acción `ESCALAR_ARRIBA`** (réplicas 1 → 2, servicio `DEGRADADO`); un segundo ciclo con el pico no la duplica.
  3. Muestras normales después → ciclo → anomalía **MITIGADA** con `resuelta_en`, servicio `SALUDABLE`.
  4. Unitarias: `severidad` en los bordes, `planificar` respeta máx (→ `NOTIFICAR_ADMIN`), enfriamiento y `ESCALAR_ABAJO` tras mitigar; anomalía en `ia` → `CAMBIAR_PROVEEDOR_IA` y `ia_forzada_a_mock` = True.
  5. Endpoints: `/monitoreo/estado` (admin sí, Laura 403), `simular-pico` devuelve `ciclo.anomalias` con una ALTA, `/monitoreo/metricas?paso=10s`, `/monitoreo/servicios` con `replicas_min/max`, `/admin/condiciones` con las 6 condiciones, `/admin/usuarios` con `clasificacion_imc`.
- Docs: filas nuevas en la §4 y notas en la §6 de `docs/02_arquitectura.md` (decisiones 2 y 4); sección Monitoreo de `backend/README.md`; comando del worker en `CLAUDE.md`. Quitar los comentarios "eso es la Etapa 6" de `banda.py` y `simulador.py`.

**Paso 2. Shared + base del escritorio:** tipos y `endpointsAdmin.ts`; `apps/desktop` con Electron (decisiones 11–13), shell, login y `npm -w apps/desktop run build` en verde. Verificar que `npm -w apps/web run build` sigue bien.

**Paso 3. Prioridad 1, Monitoreo** (polling cada 5 s con `usePolling`, que se pausa si la ventana está oculta):
- 4 tarjetas por servicio: nombre, estado (OPERATIVO / DEGRADADO), p95 de latencia, réplicas act / mín–máx y los "pips".
- Gráfica en vivo (Recharts `ComposedChart`): área de la banda μ ± 3σ, línea de latencia de `api` (`paso=10s`, 15 min), línea punteada del umbral, puntos naranja donde hay anomalías (cruce de `detectada_en` con el punto más cercano), valor actual y z.
- 4 minis con sparkline: tasa de error, RPS, CPU y memoria.
- Línea de tiempo MAPE-K del último incidente: Monitor → Analizar (`detectada_en`, z, severidad) → Planificar (`detalle`) → Ejecutar (`ejecutada_en`, réplicas antes → después) → Verificar (`resuelta_en`). Barra de 5 fases con los colores del diseño; "INCIDENTE ABIERTO · N s" o "CERRADO EN N s".
- Caja "K · LÍNEA BASE μ · σ · μ+3σ" desde `/monitoreo/estado`. Aviso si el worker no corre ("Arranca el worker: python -m app.monitoring.worker").
- Bitácora de remediaciones (`/monitoreo/acciones`) con las etiquetas ESCALAR ↑ / ESCALAR ↓ / FALLBACK / ALERTA.
- Botón **"Simular pico de tráfico"** (POST `simular-pico` a `api`) → toasts "Anomalía detectada" y "Remediación ejecutada" con la respuesta; "Incidente cerrado" cuando el polling ve la MITIGADA.
- Cabecera global: "Todos los sistemas operativos" / "N anomalías abiertas", IA efectiva, réplicas y p95 de la API.

**Paso 4. Instalador** (aquí, para que exista el `.exe` aunque falten pantallas): `electron-builder.yml`, ícono, `npm -w apps/desktop run dist` → `apps/desktop/release/FitIA Control Setup.exe`. Probar que instala y abre.

**Paso 5. Prioridad 2:** Resumen (KPIs: usuarios activos, rutinas generadas, ingresos del mes simulados, anomalías de hoy; uso de IA; dona IMC; rutinas por día; salud de la plataforma; actividad reciente). Usuarios (tabla con filtros de rol y estado, buscar, crear, editar rol/estado, desactivar; los errores `PROHIBIDO` de la API se muestran tal cual). Ejercicios + matriz (CRUD de `/admin/ejercicios` y la matriz APTO/NO contra `/admin/contraindicaciones` y `/admin/condiciones`).

**Paso 6. Prioridad 3:** Entrenadores (cola `/entrenador/rutinas-pendientes`, aprobar, rechazar, ajustar volumen; lista de entrenadores). Planes y anuncios (CRUD con borrado lógico). Reportes (ingresos, adherencia y uso de IA con Recharts; **Exportar CSV** → diálogo "Guardar como" nativo). Configuración (decisión 14).

**Paso 7. Cierre:** `apps/desktop/README.md` (arranque, URL de la API, CORS, worker, instalador sin firma, desviaciones), scripts raíz `desktop`, `desktop:dist` y `worker`, fila en `CLAUDE.md`, sección 8 de este plan ("Lo que cambió al implementar") y sección 9 ("Estado al cierre"). Sin commit.

## 5. Verificación
1. `cd backend && .venv\Scripts\python -m pytest`: las 55 pruebas de antes + las nuevas, todas en verde.
2. Demo de punta a punta: `MONITOR_INTERVAL_SEG=15` → API (`flask --app wsgi run`) + worker (`python -m app.monitoring.worker`) + `npm -w apps/desktop run dev` → login `admin@fitia.co / Admin2026*` → Monitoreo → "Simular pico" → se ve el punto rojo fuera de la banda, anomalía ALTA, `ESCALAR_ARRIBA` (api 2 → 3) en la bitácora y la línea de tiempo; en el ciclo siguiente → MITIGADA y "Incidente cerrado"; tras el enfriamiento → `ESCALAR_ABAJO` (3 → 2). Lo confirmo también por SQL (`SELECT * FROM anomalias ORDER BY id DESC LIMIT 3`).
3. `npm -w apps/desktop run build` y `npm -w apps/web run build` sin errores.
4. `npm -w apps/desktop run revision` (Playwright `_electron`) recorre todas las pantallas a 1366×768 y 1920×1080: 0 desbordes y capturas en `apps/desktop/revision/` (ignorada en git).
5. `npm -w apps/desktop run dist` genera `FitIA Control Setup.exe`; instalarlo, abrirlo, cambiar la URL de la API y entrar.
6. Datos: el ciclo de la demo deja filas en `metricas`, `anomalias` y `acciones_remediacion` de `api`. Al final pregunto antes de limpiarlas y de devolver `servicios.replicas_actuales` a la semilla (api = 2).

## 6. Riesgos
- **Rate-limit de login** (5/min por IP): no repetir el login en las revisiones automáticas; la revisión entra una sola vez.
- **Primer `npm install` con Electron** descarga ~100 MB (binario de Electron y luego NSIS para el build).
- **Tráfico real + pico sintético en la misma serie de `api`:** la decisión 9 calcula el pico sobre la base real para que la gráfica no quede en zigzag.
- **El worker y la API como procesos separados:** si el worker no corre, el pico se detecta igual (lo corre `simular-pico`), pero nunca se marca MITIGADA; la consola lo avisa.
- **Créditos:** se sigue el orden del paso 3 al 6; el instalador va antes de las pantallas de prioridad 2.

## 8. Lo que cambió al implementar
- **Nombres de variables:** `.env.example` ya traía `MONITOR_Z_UMBRAL` y `MONITOR_ERROR_UMBRAL`, así que se usan esos (no `MONITOR_Z`). Se agregó `MONITOR_ENFRIAMIENTO_SEG`.
- **El pico se diluía con el tráfico real.** La consola hace unas 9 peticiones cada 5 s (~10 ms cada una), así que 2 muestras de pico no movían la media del intervalo. Ahora `simular-pico`:
  - inyecta `max(2, intervalo/10, 3 × peticiones reales del intervalo)` muestras, repartidas en el último intervalo
  - con base real, apunta a `max(μ × factor, μ + 8σ)` (no 6σ)
  - calcula la base sin el intervalo actual

  Resultado en vivo: 5,9σ → ALTA → `ESCALAR_ARRIBA` (api 2 → 3) → MITIGADA en 12 s → `ESCALAR_ABAJO` (3 → 2) pasados los 300 s de enfriamiento.
- **Latido del worker:** se toma de la última muestra `CPU_PCT` (solo el worker la escribe), no de `lineas_base`. Una línea base pide 10 muestras, así que al arrancar parecía que el worker no corría.
- **Piso de σ por métrica** (latencia 5 ms, CPU 2 puntos, memoria 1 punto). En reposo, +0,5 % de memoria daba anomalías BAJA. Los picos reales de CPU durante los builds se siguen detectando (y avisan al admin o escalan, según la política).
- **Reintento tras el enfriamiento:** si la anomalía sigue abierta cuando acaba el enfriamiento, se repite la acción (`planificar_reintento`), como el "sigue alta → otra réplica" del diseño. Durante el enfriamiento, una anomalía nueva solo genera `NOTIFICAR_ADMIN` con "faltan N s".
- **`GET /admin/usuarios`** también devuelve `peso_kg` (para la ficha lateral de Usuarios).
- **Crear y editar usuario** devuelven el usuario público, por eso en shared se tipan como `Usuario` y la tabla completa el resto.
- **Escritorio:**
  - `postcss.config.cjs`, porque el paquete no es `"type": "module"`.
  - `electronVersion: 44.5.1` fija en `electron-builder.yml`, por los workspaces.
  - El ícono va en `recursos/`, porque `build/` está en `.gitignore`.
  - npm no corrió el postinstall de Electron: `node node_modules/electron/install.js` (documentado).
- **Monitoreo:**
  - La banda es la línea base guardada (franja horizontal, como el diseño), no la banda móvil de `/metricas`.
  - La línea se corta en los huecos sin tráfico.
  - "Simular pico" también refresca la cabecera global.

## 9. Estado al cierre (2026-10-03)

**Hecho y verificado:**
- **Backend:** `pytest` con 67 pruebas en verde (55 de antes + 12 nuevas en `tests/test_mape_k.py`). Incluyen serie normal → 0 anomalías, pico > 5σ → 1 ALTA + `ESCALAR_ARRIBA`, vuelta a la normalidad → MITIGADA y, tras el enfriamiento, `ESCALAR_ABAJO`.
- **Worker real** (`MONITOR_INTERVAL_SEG=15`) más API y consola: se completó el ciclo de punta a punta (decisión 8 de arriba).
- **Builds:** `npm -w apps/web run build` y `npm -w apps/desktop run typecheck/build` sin errores.
- **Revisión:** `revision --pico` sin desbordes en las 8 pantallas a 1366×768 y 1920×1080. Detecta el pico y lo cierra.
- **Instalador:** `FitIA Control Setup.exe` (~107 MB). Se instaló en silencio, la app instalada abrió desde `app://fitia`, recuperó la sesión cifrada y habló con la API (CORS OK). Luego se desinstaló.

**Pendiente:**
- ~~Datos de la demo en la BD~~ **Hecho (con permiso del usuario):** se vaciaron `metricas`, `lineas_base`, `anomalias` y `acciones_remediacion`, y `servicios` quedó como en la semilla (api 2 réplicas, todos SALUDABLE).
- **Etapa 7:** el worker en `docker-compose.yml`; el `README.md` raíz con capturas.
- **Probar en otra PC** de la red con la URL de la API cambiada.
