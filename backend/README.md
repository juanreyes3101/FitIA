# FitIA — Backend (API Flask)

Una sola API REST (`/api/v1`) para web, móvil y escritorio. Contrato completo en `docs/02_arquitectura.md` (sección 4).

## Arranque rápido (Windows)

```bash
# 1. Base de datos (una vez). --default-character-set evita que se dañen las tildes
mysql -u root -p --default-character-set=utf8mb4 < ../database/schema.sql
mysql -u root -p --default-character-set=utf8mb4 fitia < ../database/seed.sql

# 2. Usuario de la app con mínimo privilegio (no uses root en el .env)
#    CREATE USER 'fitia_app'@'localhost' IDENTIFIED BY '...';
#    GRANT SELECT, INSERT, UPDATE, DELETE, EXECUTE, SHOW VIEW ON fitia.* TO 'fitia_app'@'localhost';

# 3. Variables: copia ../.env.example a backend/.env y llénalo (JWT_SECRET_KEY, DB_*)

# 4. Entorno e instalación
py -3.13 -m venv .venv
.venv\Scripts\pip install -r requirements.txt

# 5. Pruebas y API
.venv\Scripts\python -m pytest
.venv\Scripts\flask --app wsgi run --debug
```

### API en la red WiFi (para la app móvil con Expo Go)

```bash
npm run api:lan          # desde la raíz = .venv\Scripts\flask --app wsgi run --host 0.0.0.0 --port 5000
```

- Escucha en todas las interfaces, así el celular la alcanza en `http://<IP-de-la-PC>:5000/api/v1` (en el equipo de desarrollo, `192.168.0.10`).
- **Sin `--debug`**: el depurador de Werkzeug permite ejecutar código y no debe quedar expuesto a la red.
- El firewall de Windows se abre **solo en el perfil Privado** (ver `apps/mobile/README.md`).
- La app nativa no necesita CORS. `CORS_ORIGINS` ya incluye `http://localhost:8081` para la vista web de Expo.

`SHOW VIEW` es necesario porque la app **refleja** el esquema (tablas y vistas) desde MySQL al arrancar: `schema.sql` es la única fuente de verdad y no hay una segunda copia del modelo en Python.

## Decisiones y desviaciones

- **Python 3.13** en lugar de 3.12 (CLAUDE.md): es la versión instalada en el equipo del equipo de desarrollo y todo el stack tiene wheels para ella. La imagen Docker usa `python:3.13-slim`.
- **IA**: `AI_PROVIDER=mock` (por defecto, sin internet) o `gemini` (capa gratuita de AI Studio, sin tarjeta). Al modelo solo se le envía el perfil anónimo (`PerfilAnonimo`): edad, IMC, nivel, objetivo, condiciones y disponibilidad. Nunca nombre, correo ni teléfono.
- **Defensa en profundidad** (no quitar ninguna capa): catálogo de `sp_ejercicios_seguros` → `ValidadorSeguridad` (7 reglas, `app/services/validador.py`) → trigger `trg_rutina_ejercicio_seguro`.
- **Regla 4**: como no hay columna de experiencia, se considera principiante a quien tiene `nivel_actividad` SEDENTARIO o LIGERO.
- **Regla 3**: duración estimada de un ejercicio = `series × (duracion_seg o repeticiones × 4 s) + series × descanso_seg`; el día no puede pasar de `minutos_por_sesion` + 10 %.
- **Flujo de rutina**: la rutina generada queda `VALIDADA` y ya es la rutina activa del usuario. El entrenador la ve en `/entrenador/rutinas-pendientes` y puede `APROBAR` (pasa a `ACTIVA` y archiva la anterior), `RECHAZAR` o `AJUSTAR`. Ajustar solo cambia el volumen (series, repeticiones, duración, descanso, notas), nunca el `ejercicio_id`, porque el trigger de seguridad solo revisa los `INSERT`.
- La explicación de la IA se guarda en `rutinas.observaciones_validacion`; si el entrenador escribe observaciones, las reemplaza.
- **Pagos simulados**: `POST /pagos/simular` valida la tarjeta con Luhn y solo guarda los últimos 4 dígitos. Un pago rechazado responde **200** con `"estado": "RECHAZADO"`, porque es un resultado de negocio. La tarjeta terminada en `0000` siempre se rechaza.
- **Estado en memoria del proceso**: la caché de rutinas (24 h), el circuit breaker (3 fallos o un 429 → Mock por 5 min), el rate-limit (5 logins/min por IP y 3 generaciones/min por usuario) y el buffer de métricas (flush cada 10 s) no se comparten entre procesos. Por eso Gunicorn corre con **1 worker** y varios hilos.
- Un *hit* de caché no gasta cupo ni se registra en `solicitudes_ia`. Al llegar a `IA_MAX_SOLICITUDES_DIA` se pasa a Mock sin mostrar error. Agotar el cupo mensual del plan sí es visible (`402 CUPO_IA_AGOTADO`).
- **Monitoreo (MAPE-K)**: ver la sección "Monitoreo autónomo" más abajo.

## Monitoreo autónomo (MAPE-K)

```bash
.venv\Scripts\python -m app.monitoring.worker      # proceso aparte de la API; Ctrl+C para detenerlo
```

- Cada `MONITOR_INTERVAL_SEG` (60 s; **15 s para la demo**) corre Monitor → Analizar → Planificar → Ejecutar → Verificar (`app/monitoring/mape_k.py`).
- Variables: `MONITOR_VENTANA_MIN` (30), `MONITOR_Z_UMBRAL` (3), `MONITOR_ERROR_UMBRAL` (0.05) y `MONITOR_ENFRIAMIENTO_SEG` (300).
- **Analizar:** EWMA α=0.3 de las medias por minuto (μ) y σ de las muestras de la ventana → `lineas_base`. Para el valor del último intervalo, z = (x − μ)/σ. Es anomalía si z > 3 o si la tasa de error pasa del 5 %. Severidad: 3-4σ BAJA, 4-5σ MEDIA, > 5σ ALTA; tasa de error ≥ 50 % = CRÍTICA. σ tiene un piso por métrica (latencia 5 ms, CPU 2 puntos, memoria 1 punto) para que la calma total no vuelva anomalía cualquier variación mínima.
- **Planificar** (`politicas.py`):
  - latencia, RPS o CPU alta en `api`/`web` → `ESCALAR_ARRIBA`, o `NOTIFICAR_ADMIN` si ya está en el máximo
  - `ia` lenta o con errores → `CAMBIAR_PROVEEDOR_IA`
  - errores en `api`/`web` → `REINICIAR_WORKER`
  - CRÍTICA → además `NOTIFICAR_ADMIN`
  - con enfriamiento por servicio; si sigue alta tras el enfriamiento, se repite la acción
- **Ejecutar (simulado):** `servicios.replicas_actuales` y `estado` + `acciones_remediacion`.
- **Verificar:** en el ciclo siguiente, si el valor vuelve a la banda de su línea base → `MITIGADA`. Pasado el enfriamiento, `ESCALAR_ABAJO` hasta las réplicas de antes del incidente.
- **Demo:** `POST /monitoreo/simular-pico` inserta el pico (solo en el último intervalo) y corre el ciclo en el acto; la MITIGADA la marca el worker. Si la métrica ya tiene ≥ 30 muestras reales, el pico se calcula sobre esa base real (`max(μ × factor, μ + 8σ)`).
- **Cambiar a Mock:** el worker y la API son procesos distintos. La API consulta la BD: mientras haya una acción `CAMBIAR_PROVEEDOR_IA` con su anomalía abierta, usa Mock.

## Pruebas

Corren contra la BD `fitia` real ya sembrada. Las pruebas que escriben datos crean usuarios descartables `test_*@pruebas.fitia.co` y los borran al terminar. La prueba de generar con Laura borra la rutina y la solicitud que crea. Si Laura ya gastó su cupo del mes, se lo presta durante la prueba y al final deja sus datos exactamente como estaban.

## Cupo de IA de Laura (demo)

El plan Free permite 2 rutinas IA al mes y la semilla ya gasta 1. Tras la demo de `POST /rutinas/generar` le queda 0. Para resetear, vuelve a cargar `schema.sql` y `seed.sql`, o borra sus solicitudes del mes:

```sql
-- La semilla crea la rutina 1 y la solicitud 1 de Laura; esto borra todo lo generado después
DELETE FROM solicitudes_ia WHERE usuario_id = 3 AND id > 1;
DELETE FROM rutinas WHERE usuario_id = 3 AND id > 1;
UPDATE rutinas SET estado = 'ACTIVA' WHERE id = 1;
```

## Formato de error

Todas las respuestas de error siguen `{"error": {"codigo": "...", "mensaje": "..."}}`.

| Código | HTTP |
|---|---|
| `DATOS_INVALIDOS`, `TARJETA_INVALIDA`, `PERFIL_INCOMPLETO`, `TERMINOS_NO_ACEPTADOS` | 400 |
| `NO_AUTENTICADO`, `CREDENCIALES_INVALIDAS`, `SESION_EXPIRADA` | 401 |
| `CUPO_IA_AGOTADO` | 402 |
| `PROHIBIDO`, `CUENTA_INACTIVA` | 403 |
| `NO_ENCONTRADO`, `PLAN_INEXISTENTE`, `SIN_RUTINA` | 404 |
| `CORREO_EN_USO`, `CONFLICTO`, `EN_USO`, `ESTADO_INVALIDO` | 409 |
| `EJERCICIO_CONTRAINDICADO` (trigger), `RUTINA_NO_SEGURA`, `SIN_EJERCICIOS_SEGUROS` | 422 |
| `DEMASIADAS_SOLICITUDES` | 429 |
| `ERROR_INTERNO`, `ERROR_BD` | 500 |
