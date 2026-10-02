# Backend FitIA — Etapa 3 (API Flask + IA + validador)

> Plan preparado para retomarse en una sesión nueva de Claude Code. Léelo completo antes de implementar — contiene decisiones ya confirmadas con el usuario, no se deben volver a preguntar.

## Contexto

FitIA es un proyecto universitario (CUN) sin backend todavía: `backend/`, `apps/` y `packages/` no existen en el repo. Ya existen `database/schema.sql` (fuente de verdad: 27 tablas, 1 función, 5 triggers, 3 procedimientos, 6 vistas), `database/seed.sql` (usuarios demo con hash Werkzeug), `docs/02_arquitectura.md` (contrato de API, módulo de IA, reglas del validador) y `.env.example` (raíz). El usuario pidió textualmente el prompt oficial "Etapa 3" del proyecto (`docs/03_prompts_claude_code.md`): construir el backend completo con Flask + SQLAlchemy Core, auth JWT por roles, todos los endpoints de la tabla de la sección 4, el módulo `ai/` con `GeminiProvider`/`MockProvider` + circuit breaker + caché 24h, el validador de seguridad como cadena de responsabilidad, middleware de métricas, pruebas pytest, y terminar corriendo las pruebas + una demo real de `POST /rutinas/generar` con `laura@fitia.co`.

Restricción dura: **costo $0** (solo software libre), y la defensa en profundidad de 3 capas (catálogo seguro → `ValidadorSeguridad` → trigger SQL) es innegociable.

## Decisiones ya confirmadas con el usuario (NO volver a preguntar)

- **Python**: usar el 3.13 ya instalado localmente (no hay 3.12 en el equipo); se documenta la desviación de CLAUDE.md en `backend/README.md`. Todo el stack tiene wheels para 3.13.
- **Base de datos**: `schema.sql`/`seed.sql` **todavía no estaban cargados** al momento de este plan. El "Paso 0" de la implementación incluye correr `mysql -u root -p < database/schema.sql && mysql -u root -p fitia < database/seed.sql` contra la instancia local (servicio `MySQL267`, puerto 3306 ya activo) antes de poder levantar la app o correr pytest. Se necesitarán las credenciales reales para `backend/.env` en ese momento — pedírselas al usuario si no las ha dado.
- **Flujo de rutina generada por IA**: al pasar el validador queda en estado `VALIDADA` y es inmediatamente la "rutina activa" del usuario (`GET /rutinas/activa` considera `VALIDADA` y `ACTIVA` como vigentes). El entrenador la ve en su cola de pendientes (`GET /entrenador/rutinas-pendientes` = rutinas en `VALIDADA`) y puede aprobarla a `ACTIVA` (archivando la `ACTIVA` previa si existía) o rechazarla (`RECHAZADA` + `observaciones_validacion`) — sin bloquear al usuario mientras tanto.
- **Pago rechazado simulado**: `POST /pagos/simular` devuelve **200 OK** con `{"estado": "RECHAZADO", "motivo_rechazo": "..."}` en el cuerpo (es un resultado de negocio esperado). El envoltorio `{"error":{...}}` se reserva para fallos técnicos reales (plan inexistente, número de tarjeta que no pasa Luhn, no autenticado, etc.).

## Decisiones de diseño (técnicas, ya resueltas, no requieren más confirmación)

1. **Alcance MAPE-K**: esta etapa solo implementa la fase *Monitor* (middleware que escribe en `metricas` en lote) y lecturas simples de `/monitoreo/*`. El ciclo completo (worker APScheduler con Analyze/Plan/Execute, `mape_k.py`, `politicas.py`) es la Etapa 6, una fase futura — **no se construye ahora**. `GET /monitoreo/metricas` calcula la banda (media/desviación) al vuelo con pandas sobre la ventana pedida, sin depender de un worker. `POST /monitoreo/simular-pico` solo escribe métricas sintéticas (NumPy) en `metricas`, sin disparar detección de anomalías.
2. **`ai/claude.py`** (mencionado en el árbol de `docs/02_arquitectura.md` sección 3) **no se crea**: es una inconsistencia del propio documento: ningún otro lugar describe un `ClaudeProvider`, y el prompt oficial de la Etapa 3 solo pide Gemini + Mock.
3. **Acceso a datos**: `MetaData` **reflejada** desde el engine al iniciar `create_app()` (no se redeclaran las 27 tablas a mano) — evita una segunda copia del esquema que se desincronice de `schema.sql`. Las columnas generadas (`mediciones_corporales.imc`) se reflejan correctamente como `Computed`, evitando insertarlas por accidente. Las 6 vistas se reflejan igual, de solo lectura.
4. **Procedimientos con `OUT`** (`sp_simular_pago`, `sp_cupo_ia`): un helper único `call_proc_con_out(conn, nombre, params_in, nombres_out)` en `app/db.py` que ejecuta `CALL ...(@out1,@out2)` sobre el cursor crudo de PyMySQL, vacía result sets residuales (`while cursor.nextset(): pass`) y luego `SELECT @out1, @out2` en la misma conexión. `sp_ejercicios_seguros` (sin `OUT`) se invoca como `SELECT` normal vía `text("CALL sp_ejercicios_seguros(:uid)")`.
5. **Caché de rutina (24h) y circuit breaker**: en memoria de proceso (no hay Redis ni tabla de caché en el esquema; despliegue de un solo proceso). Ambos viven en `app.extensions[...]` (creados dentro de `create_app()`, no como singletons de módulo) para que los tests no arrastren estado entre sí. Circuit breaker: 3 fallos consecutivos **o** un solo 429 → Mock por 5 minutos; pasa a semi-abierto al expirar. Limitación documentada en el README (no compartido entre workers de Gunicorn).
6. **Caché y cupo de IA**: un *hit* de caché (perfil+catálogo sin cambios, <24h) **no** consume cupo ni se registra en `solicitudes_ia` — no hubo llamada real a la IA, consistente con el propósito de la caché (ahorrar cuota). Solo las llamadas reales a un proveedor (Gemini o Mock) se registran y cuentan.
7. **Límite diario global `IA_MAX_SOLICITUDES_DIA`**: al alcanzarse, degrada en silencio a `MockProvider` para nuevas solicitudes (no es un error visible para el usuario), distinto del cupo mensual por plan (`sp_cupo_ia`, que sí es `CUPO_IA_AGOTADO` visible).
8. **Middleware de métricas**: buffer en memoria (lock) + flush en lote cada 10s vía un job de `APScheduler` `BackgroundScheduler` (ya está en el stack obligatorio) registrado en `create_app()`, desactivado en modo test. Mapeo simple: ruta `/rutinas/generar` → servicio `ia`, todo lo demás → servicio `api`.
9. **Validador puro**: `services/validador.py` recibe un `ContextoValidacion` ya construido (catálogo, contraindicaciones, perfil) como argumentos — nunca toca la BD directamente. Esto permite testear las 7 reglas sin MySQL.
10. **Luhn**: `POST /pagos/simular` recibe el número completo de tarjeta de prueba solo para calcular Luhn y derivar `ultimos4`; nunca se persiste ni se loguea (regla dura de código, nada de `print`/`logger.debug` con ese campo).
11. **Tests contra la BD real `fitia`** ya sembrada (el `schema.sql` tiene `CREATE DATABASE fitia` hardcodeado, no hay BD de prueba separada viable sin editar el schema). Aislamiento por `DELETE` dirigido sobre usuarios `test_*` creados en cada test (no por rollback de transacción, porque `sp_simular_pago` hace `COMMIT` interno). Los tests de pago **nunca** usan `laura@fitia.co`/`andres@fitia.co` (crean un usuario descartable), para no romper el estado de los datos demo que se usará en la demo final.

## Estructura de archivos a crear

```
backend/
├── .env                        # copiado de /.env.example, con credenciales reales (no se comitea)
├── requirements.txt
├── wsgi.py                     # app = create_app()
├── pytest.ini
├── Dockerfile
├── README.md                   # quickstart + nota sobre Python 3.13 y límites de caché/breaker en memoria
├── app/
│   ├── __init__.py             # create_app(): config, engine+reflexión, blueprints, JWT, CORS, errores, scheduler
│   ├── config.py                # carga .env, valida variables obligatorias
│   ├── extensions.py            # jwt_manager, cors, scheduler (evita imports circulares)
│   ├── errors.py                 # ApiError + error handler global {"error":{"codigo","mensaje"}}
│   ├── db.py                     # get_engine, reflect_metadata, call_proc_con_out
│   ├── middleware/
│   │   ├── auth_jwt.py            # @requiere_rol(*roles), claims/identity loaders
│   │   ├── rate_limit.py           # limitador en memoria (5 login/min, 3 IA/min)
│   │   └── metricas.py             # before/after_request + buffer + flush APScheduler 10s
│   ├── api/                        # blueprints (uno por dominio de la tabla de endpoints)
│   │   ├── salud.py, auth.py, imc.py, perfil.py, ejercicios.py, rutinas.py,
│   │   │   sesiones.py, progreso.py, planes.py, pagos.py, anuncios.py,
│   │   │   entrenador.py, reportes.py, monitoreo.py
│   │   └── admin/ (usuarios.py, ejercicios.py, contraindicaciones.py, planes.py, anuncios.py)
│   ├── services/                   # rutinas.py (orquestador IA), validador.py (7 reglas), pagos.py (Luhn+SP),
│   │   │                            reportes.py (pandas), monitoreo.py, entrenador.py, auth.py, perfil.py, sesiones.py, ejercicios.py
│   ├── ai/                          # base.py (AdaptadorIA), circuit_breaker.py, cache.py,
│   │   │                             gemini.py, mock.py, prompts.py, schema.py (PerfilAnonimo, RutinaIA pydantic)
│   ├── monitoring/                   # banda.py (pandas), simulador.py (numpy) — SOLO esto, nada de mape_k.py/politicas.py
│   └── repositories/                  # usuarios, perfiles, ejercicios, rutinas, sesiones, pagos, planes,
│                                        anuncios, solicitudes_ia, monitoreo, reportes
└── tests/
    ├── conftest.py                    # app/client/engine fixtures, usuario_descartable, tokens
    ├── test_imc.py, test_auth.py, test_validador.py (5 casos puros),
    ├── test_rutinas.py (generar con mock + laura), test_pagos.py (Luhn + aprobado/rechazado), test_monitoreo.py
```

Cada endpoint nuevo llevará su fila correspondiente añadida/verificada en la tabla de `docs/02_arquitectura.md` sección 4 (ya existe completa, solo se confirma que el código la cumple).

## `requirements.txt`

```
Flask, flask-cors, python-dotenv, SQLAlchemy, PyMySQL, cryptography,
pydantic, email-validator, Flask-JWT-Extended, APScheduler, pandas, numpy,
google-genai, gunicorn, pytest
```
`cryptography` es dependencia real de PyMySQL para `caching_sha2_password` de MySQL 8 (no opcional). Se usa `werkzeug.security` (ya viene con Flask) para hashes, no se agrega `bcrypt`/`passlib`. Rate-limit a mano, no `Flask-Limiter` (consistente con "todo en memoria de proceso").

## Flujo clave: `POST /rutinas/generar`

1. JWT → `usuario_id`. 2. Cargar perfil+condiciones activas+catálogo seguro (`CALL sp_ejercicios_seguros`). 3. Construir `PerfilAnonimo` (edad, IMC+clasificación, nivel, objetivo, condiciones, disponibilidad — **nunca** nombre/correo/teléfono). 4. Si hay caché vigente (<24h) para ese perfil+catálogo → devolver directo (sin tocar cupo). 5. `CALL sp_cupo_ia` → si 0 restantes → `CUPO_IA_AGOTADO`. 6. Si se alcanzó `IA_MAX_SOLICITUDES_DIA` global → forzar Mock. 7. Elegir proveedor (Gemini si `AI_PROVIDER=gemini` y breaker cerrado, si no Mock). 8. Generar → validar con las 7 reglas → hasta 2 reintentos pasando los errores al modelo → si se agotan, fallback a Mock. 9. Persistir transaccionalmente `rutinas`(`VALIDADA`)→`rutina_dias`→`rutina_ejercicios` (el trigger `trg_rutina_ejercicio_seguro` es la última defensa; cualquier bloqueo se traduce al formato de error único). 10. Registrar en `solicitudes_ia`. 11. Cachear 24h. 12. Responder 201 con la rutina persistida.

## Verificación (al retomar)

1. **Paso 0**: confirmar `backend/.env` con credenciales reales de MySQL; correr `database/schema.sql` + `database/seed.sql` contra la instancia local si aún no están cargados.
2. Crear `backend/.venv`, instalar `requirements.txt`.
3. `cd backend && pytest` — deben pasar los 8+ casos (validador ×5, login, generar-rutina-mock, pagos aprobado/rechazado).
4. Levantar la API (`flask --app wsgi run --debug`) y ejecutar un `POST /rutinas/generar` real autenticado como `laura@fitia.co` (login previo para obtener el JWT), mostrando la respuesta completa — este es el criterio de aceptación pedido explícitamente por el usuario.
5. Si en ese momento no hay credenciales de BD disponibles, el código quedará completo pero el paso 3/4 se documentará como bloqueado hasta que se provean.

## Casos de prueba pytest concretos

| # | Archivo | Caso | Qué verifica |
|---|---|---|---|
| 1 | `test_validador.py` | Rutina "segura" para perfil sin condiciones | Las 7 reglas pasan, lista de errores vacía |
| 2 | `test_validador.py` | Ejercicio contraindicado incluido (condición `DOLOR_LUMBAR` activa) | Regla 2 devuelve error específico |
| 3 | `test_validador.py` | `DOLOR_LUMBAR` activa pero ningún día tiene ejercicio `apto_lumbar` de MOVILIDAD/ESTIRAMIENTO | Regla 5 devuelve error por día incumplido |
| 4 | `test_validador.py` | Usuario `SEDENTARIO`/principiante con ejercicio `AVANZADO` o 5+ series | Regla 4 devuelve error |
| 5 | `test_validador.py` | `OBESIDAD`/`DOLOR_RODILLA` con ejercicio de impacto `ALTO` | Regla 6 devuelve error |
| 6 | `test_auth.py` | Login `laura@fitia.co`/`Demo2026*` → 200+JWT con rol; password incorrecta → 401 con formato de error | Hash werkzeug del seed + formato único de error |
| 7 | `test_rutinas.py` | `POST /rutinas/generar` con `laura@fitia.co`, `AI_PROVIDER=mock` | 201, esquema pydantic cumplido, ejercicios dentro del catálogo seguro, fila en `solicitudes_ia` |
| 8 | `test_pagos.py` | Tarjeta válida (Luhn OK, no 0000) → APROBADO + suscripción activa; últimos4=`0000` → RECHAZADO sin nueva suscripción | Integración con `sp_simular_pago` + Luhn |

## Riesgos/notas menores que quedaron abiertos (no bloqueantes, usar criterio al implementar)

- Confirmar disponibilidad real de wheels de `cryptography` en la imagen Docker elegida; si falla el build, agregar `build-essential`/`libssl-dev` vía `apt-get`.
- `GEMINI_MODEL` puede cambiar de alias en AI Studio; `GeminiProvider` debe manejar "modelo no encontrado" abriendo el circuit breaker hacia Mock, no como excepción no controlada.
- Se asume pydantic v2 (`model_validate`), consistente con el estándar actual.
