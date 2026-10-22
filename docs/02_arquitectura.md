# FitIA — Documento de arquitectura

Arquitectura **cliente-servidor en capas**, con **una sola API REST** que consumen tres clientes (web, móvil y ejecutable de escritorio), una base de datos **MySQL** y un **módulo de monitoreo autónomo** (ciclo MAPE-K). Conserva el stack del anteproyecto (React + Flask/Pandas/NumPy + MySQL) y le suma la app móvil, el ejecutable y la IA.

Diagramas en `docs/diagramas/` (PNG para el documento, SVG para hacer zoom, y el archivo fuente editable).

| # | Diagrama | Materia | Archivo |
|---|---|---|---|
| 1 | Modelo entidad-relación | Bases de Datos | `01_modelo_entidad_relacion` |
| 2 | Casos de uso (UML) | Arquitectura | `02_casos_de_uso` |
| 3 | Secuencia: generar rutina con IA | Arquitectura | `03_secuencia_generar_rutina` |
| 4 | Despliegue y topología de red | Redes / Arquitectura | `04_despliegue_red` |
| 5 | BPMN del proceso principal (`.bpmn` abre en bpmn.io o Camunda) | Arquitectura | `05_bpmn_proceso_principal` |
| 6 | Arquitectura de componentes | Arquitectura | `06_arquitectura_componentes` |
| 7 | Monitoreo autónomo MAPE-K | Redes | `07_monitoreo_mape_k` |
| 8 | Despliegue con Docker Compose (Nginx + API + worker + MySQL) | Redes / Arquitectura | `08_despliegue_docker` (SVG editable) |

---

## 1. Requisitos

### Funcionales
| ID | Requisito | Cliente |
|---|---|---|
| RF01 | Registro e inicio de sesión con roles (Usuario, Entrenador, Admin) | Web, móvil, exe |
| RF02 | Calculadora de IMC pública con clasificación OMS | Web, móvil |
| RF03 | Perfil de salud: peso, estatura, nivel de actividad, objetivo, molestias y disponibilidad | Web, móvil |
| RF04 | Generar una rutina personalizada con IA a partir del perfil | Web, móvil |
| RF05 | Validar que la rutina sea segura según las condiciones del usuario antes de guardarla | Backend |
| RF06 | Biblioteca de ejercicios para molestia lumbar | Web, móvil |
| RF07 | Modo entreno: registrar series, esfuerzo (RPE) y dolor | Móvil (principal), web |
| RF08 | Progreso: peso, IMC, adherencia y dolor en el tiempo | Web, móvil |
| RF09 | Planes Free (con publicidad) y Pro, con pago SIMULADO (tarjeta, PSE, Nequi) | Web, móvil |
| RF10 | El entrenador revisa y aprueba o ajusta rutinas | Exe |
| RF11 | El admin gestiona usuarios, ejercicios, contraindicaciones, planes y anuncios | Exe |
| RF12 | Reportes de ingresos simulados, uso de IA y adherencia (Pandas) | Exe |
| RF13 | Monitoreo: métricas, línea base dinámica, detección de anomalías y auto-remediación simulada | Backend + exe |
| RF14 | Página "Sobre nosotros" | Web |

### No funcionales
| ID | Requisito |
|---|---|
| RNF01 | Seguridad: contraseñas con hash (pbkdf2/bcrypt), JWT con expiración, HTTPS, CORS restringido, rate-limit en login y en IA |
| RNF02 | Datos de salud: consentimiento explícito (Ley 1581 de 2012), opción de descargar y borrar los datos, nunca guardar el número completo de la tarjeta |
| RNF03 | Disponibilidad: si la IA falla, el sistema entrega una rutina base segura (proveedor *Mock*) |
| RNF04 | Rendimiento: p95 < 500 ms en endpoints sin IA; generación con IA < 20 s |
| RNF05 | Portabilidad: una sola API para los 3 clientes; `docker compose up` levanta todo |
| RNF06 | Mantenibilidad: capas separadas, adaptador de IA intercambiable, pruebas automáticas del validador y de los endpoints |
| RNF07 | **Costo $0**: solo software libre o capas gratuitas que no piden tarjeta; ningún componente puede requerir pago (ver README, "Presupuesto $0") |

---

## 2. Decisiones de arquitectura

| Decisión | Elegido | Por qué |
|---|---|---|
| Estilo | Cliente-servidor en capas + API REST | Lo pide el curso; tres clientes comparten la misma lógica |
| Backend | Python 3.12 + Flask (Blueprints) | Ya está en el anteproyecto; Pandas y NumPy para reportes y monitoreo |
| BD | MySQL 8 | Ya está en el anteproyecto (Workbench); soporta triggers, procedimientos, vistas y columnas generadas |
| Acceso a datos | SQLAlchemy Core + llamadas a los procedimientos | Permite mostrar SQL real en la materia de BD sin perder seguridad (consultas parametrizadas) |
| Web | React 18 + Vite + TypeScript + Tailwind | El anteproyecto dice React; Vite es liviano |
| Móvil | React Native + Expo | Se reutiliza React y TypeScript; se prueba en el celular con Expo Go, sin Mac |
| Costo | $0: solo herramientas libres y capas gratuitas sin tarjeta | Restricción del equipo: no hay presupuesto |
| Ejecutable | Electron + React → `FitIA Control.exe` | Reutiliza componentes web; `electron-builder` genera el instalador `.exe` |
| Código compartido | `packages/shared` (tipos, cliente API, tokens de diseño) | Un solo contrato entre los 3 clientes |
| IA | Patrón **Strategy**: `AdaptadorIA` → `GeminiProvider` (gratis) / `MockProvider` | Se cambia de proveedor con una variable de entorno; el monitor puede conmutarlo solo |
| Seguridad de rutinas | **Defensa en profundidad**: (1) a la IA solo se le pasa el catálogo permitido, (2) el validador en Python revisa, (3) el trigger de MySQL bloquea | La IA puede equivocarse; la BD no deja pasar un ejercicio contraindicado |
| Monitoreo | Middleware + worker APScheduler + tablas MAPE-K | Simula una red autónoma sin infraestructura paga |

### Patrones de diseño que se pueden sustentar
- **Capas** (controlador → servicio → repositorio)
- **Strategy** (proveedores de IA)
- **Repository** (acceso a datos)
- **Chain of Responsibility** (reglas del `ValidadorSeguridad`: cada regla aprueba o reporta un error)
- **Observer** (el middleware de métricas observa cada petición)
- **Circuit Breaker** (si la IA falla 3 veces seguidas, se pasa a Mock durante N minutos)

---

## 3. Estructura del repositorio (monorepo)

```
FitIA/
├── CLAUDE.md                 ← contexto para Claude Code
├── README.md
├── docker-compose.yml        ← mysql + api + worker + nginx (docker compose up)
├── docker/                   ← nginx.conf, imagen de la web, usuario de MySQL para Docker
├── .env.example
├── database/
│   ├── schema.sql            ← tablas, triggers, procedimientos, vistas
│   └── seed.sql              ← catálogos + usuarios demo
├── backend/
│   ├── app/
│   │   ├── __init__.py       ← create_app()
│   │   ├── config.py
│   │   ├── middleware/       ← auth_jwt.py, metricas.py, rate_limit.py
│   │   ├── api/              ← blueprints: auth, perfil, rutinas, sesiones, pagos, admin, reportes, monitoreo
│   │   ├── services/         ← rutinas.py, validador.py, pagos.py, reportes.py
│   │   ├── ai/               ← base.py, claude.py, gemini.py, mock.py, prompts.py, schema.py
│   │   ├── monitoring/       ← mape_k.py (monitor, analizar, planificar, ejecutar), politicas.py, simulador.py
│   │   └── repositories/
│   ├── tests/
│   ├── requirements.txt
│   └── wsgi.py
├── apps/
│   ├── web/                  ← React + Vite
│   ├── mobile/               ← Expo
│   └── desktop/              ← Electron (carga apps/desktop/renderer)
├── packages/
│   └── shared/               ← tipos TS, cliente API (fetch), tokens de diseño
└── docs/
    ├── diagramas/
    ├── diseno/               ← exportaciones de Claude Design
    └── *.md
```

---

## 4. Contrato de la API (`/api/v1`)

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/auth/registro` | público | Crea el usuario y su suscripción Free |
| POST | `/auth/login` | público | Devuelve un JWT (access 1 h + refresh 7 d) |
| POST | `/auth/refresh` | refresh token | Emite un nuevo access token |
| GET | `/imc?peso=&estatura=` | público | Calcula y clasifica el IMC |
| GET/PUT | `/perfil` | usuario | Perfil de salud y condiciones. GET incluye `cupo_ia_restante` (`sp_cupo_ia`); PUT acepta además `fecha_nacimiento` y `sexo` (onboarding) |
| POST | `/perfil/mediciones` | usuario | Nueva medición (el trigger actualiza las condiciones) |
| GET | `/ejercicios?tipo=&lumbar=` | usuario | Catálogo filtrable |
| GET | `/ejercicios/seguros` | usuario | `CALL sp_ejercicios_seguros` |
| POST | `/rutinas/generar` | usuario | Flujo IA + validación (ver diagrama de secuencia) |
| GET | `/rutinas/activa` | usuario | Rutina vigente con sus días |
| POST | `/sesiones` | usuario | Registra la sesión, el RPE y el dolor |
| GET | `/progreso?dias=90` | usuario | Datos de las vistas `v_progreso_corporal` y `v_adherencia_semanal` |
| GET | `/planes` | público | Planes activos |
| POST | `/pagos/simular` | usuario | `CALL sp_simular_pago` |
| GET | `/anuncios?ubicacion=` | usuario Free | Anuncio a mostrar |
| GET | `/entrenador/rutinas-pendientes` | entrenador | Cola de revisión |
| PATCH | `/entrenador/rutinas/{id}` | entrenador | Aprobar o ajustar |
| CRUD | `/admin/usuarios`, `/admin/ejercicios`, `/admin/contraindicaciones`, `/admin/planes`, `/admin/anuncios` | admin | Gestión. `GET /admin/usuarios` incluye `peso_kg`, `imc`, `clasificacion_imc` y `plan` (`v_usuario_resumen`) |
| GET | `/admin/condiciones` | admin | Catálogo de condiciones (columnas de la matriz ejercicio × condición) |
| GET | `/reportes/{ingresos\|uso-ia\|adherencia}` | admin | Pandas → JSON o CSV |
| GET | `/monitoreo/servicios` | admin | `v_salud_servicios` + `replicas_min` y `replicas_max` |
| GET | `/monitoreo/metricas?servicio=&metrica=&min=60&paso=1min` | admin | Serie de tiempo + banda μ ± 3σ (`paso` = `10s`, `30s` o `1min`) |
| GET | `/monitoreo/anomalias`, `/monitoreo/acciones` | admin | Bitácora MAPE-K |
| GET | `/monitoreo/estado` | admin | Parámetros del detector, latido del worker, proveedor de IA efectivo y la última línea base por servicio y métrica |
| POST | `/monitoreo/simular-pico` | admin | Inyecta un pico sintético y corre el ciclo MAPE-K en el acto (devuelve `ciclo` con las anomalías y acciones) |
| GET | `/health` | público | Liveness/readiness |

Formato de error único: `{ "error": { "codigo": "CUPO_IA_AGOTADO", "mensaje": "..." } }`. Catálogo de códigos en `backend/README.md`.

---

## 5. Módulo de IA

**Entrada al modelo** (en `ai/prompts.py`): perfil resumido (edad, IMC y su clasificación, nivel, objetivo, condiciones con severidad, días y minutos disponibles, lugar) + **lista de ejercicios permitidos** (id, nombre, tipo, dificultad, impacto), sacada de `sp_ejercicios_seguros`.

**Salida exigida:** JSON que cumpla este esquema (se valida con `pydantic`):
```json
{
  "nombre": "string",
  "semanas": 4,
  "dias": [
    { "dia_numero": 1, "enfoque": "string",
      "ejercicios": [
        { "ejercicio_id": 22, "orden": 1, "series": 1, "repeticiones": null,
          "duracion_seg": 1200, "descanso_seg": 60, "notas": "string" } ] } ],
  "explicacion": "por qué esta rutina para este perfil (máx. 3 frases)"
}
```

**Reglas del `ValidadorSeguridad`** (cada una es una clase; la cadena devuelve una lista de errores):
1. Todos los `ejercicio_id` existen y están en el catálogo permitido.
2. Ninguno está en `contraindicaciones` para una condición activa del usuario.
3. Número de días = `dias_disponibles`; la duración estimada ≤ `minutos_por_sesion` + 10 %.
4. Principiante o sedentario → nada de dificultad AVANZADO ni más de 4 series.
5. Si hay `DOLOR_LUMBAR` → al menos 1 ejercicio `apto_lumbar` de MOVILIDAD o ESTIRAMIENTO por día.
6. OBESIDAD o DOLOR_RODILLA → ningún ejercicio de impacto ALTO.
7. Cada día termina con un estiramiento.

Si falla: hasta 2 reintentos enviándole los errores al modelo; si sigue fallando → `MockProvider` (una plantilla segura armada por reglas) y se registra `RECHAZADA_VALIDACION`.

**Proveedores (costo $0):** `GeminiProvider` (Google AI Studio, capa gratuita sin tarjeta) y `MockProvider` (reglas, sin internet; se usa en desarrollo, en las pruebas y como respaldo). Se elige con `AI_PROVIDER` en `.env`. Como la capa gratuita tiene límites de peticiones por minuto y por día, el backend: (1) cachea la rutina 24 h por perfil, (2) aplica `IA_MAX_SOLICITUDES_DIA`, y (3) si Gemini responde 429 (cuota agotada) pasa a Mock automáticamente, y el monitor lo registra como remediación `CAMBIAR_PROVEEDOR_IA`. La interfaz `AdaptadorIA` permite agregar otro proveedor en el futuro sin tocar el resto del código.

**Privacidad con la capa gratuita:** Google puede usar los datos de la capa gratuita para mejorar sus productos, por eso al modelo **solo** se le envía un perfil anónimo (edad, IMC, nivel, objetivo, condiciones y disponibilidad), nunca el nombre, el correo ni el teléfono.

---

## 6. Módulo de monitoreo autónomo (Innovación Tecnológica de Redes)

Implementa el ciclo **MAPE-K** del *autonomic computing* (IBM), la base conceptual de las redes autónomas y la AIOps:

| Fase | Implementación |
|---|---|
| **Monitor** | Middleware de Flask: en cada petición mide la latencia, el código HTTP y el servicio; guarda en lote en `metricas` cada 10 s. El worker agrega RPS, tasa de error y CPU/memoria (`psutil`). |
| **Analyze** | Cada 60 s, con Pandas: media móvil exponencial (EWMA, α = 0.3) y desviación estándar en una ventana de 30 min → `lineas_base`. Para el valor actual se calcula z = (x − μ)/σ. Es anomalía si \|z\| > 3, o si la tasa de error > 5 %. Severidad: 3-4σ BAJA, 4-5σ MEDIA, > 5σ ALTA, servicio caído CRÍTICA. |
| **Plan** | Tabla de políticas (`monitoring/politicas.py`): latencia alta + RPS alto → escalar arriba; RPS bajo 15 min → escalar abajo; 5xx → reiniciar worker; latencia de IA alta o errores → cambiar a Mock (circuit breaker); CRÍTICA → notificar al admin. Respeta `replicas_min` y `replicas_max` y un enfriamiento de 5 min. |
| **Execute** | Simulado: actualiza `servicios.replicas_actuales` y escribe en `acciones_remediacion`. En el ciclo siguiente se verifica: si la métrica volvió a la banda → anomalía MITIGADA. |
| **Knowledge** | `lineas_base` + historial de anomalías y acciones. |

**Cómo quedó implementado** (`backend/app/monitoring/`: `analisis.py`, `politicas.py`, `mape_k.py`, `worker.py`):
- El worker corre aparte: `python -m app.monitoring.worker`, un ciclo cada `MONITOR_INTERVAL_SEG`. El ciclo se protege con `GET_LOCK` de MySQL.
- El valor actual es la media del último intervalo; la línea base usa el resto de la ventana y **excluye los tramos de anomalías ya detectadas**, para no aprender del incidente.
- **Detección de un solo lado** (z > 3, no |z| > 3): una latencia, un error o una CPU bajos no son un problema. Mientras una anomalía siga ABIERTA no se duplica.
- La verificación compara el valor nuevo con la línea base **guardada** de la anomalía (Knowledge).
- **Escalar abajo:** `acciones_remediacion.anomalia_id` es obligatorio, así que no hay "RPS bajo 15 min" sin anomalía. Tras mitigar y pasado el enfriamiento, el servicio vuelve una réplica por ciclo a las que tenía antes del incidente (`ESCALAR_ABAJO` ligado a esa anomalía).
- **Cambiar a Mock entre procesos:** mientras haya una acción `CAMBIAR_PROVEEDOR_IA` con su anomalía ABIERTA, la API usa Mock (`repo.ia_forzada_a_mock`).
- El worker mide la CPU y la memoria del equipo (`psutil`) y la tasa de error de Gemini desde `solicitudes_ia`.

Para la sustentación: el botón **"Simular pico de tráfico"** de la consola inyecta métricas sintéticas (NumPy: ruido normal + un pico) y se ve el ciclo completo en vivo.

Opcional, si el profesor lo pide: exponer `/metrics` en formato Prometheus y conectar Grafana con Docker.

---

## 7. Base de datos (resumen para la materia)

- **42 objetos**: 27 tablas en 5 dominios, 1 función, 5 triggers, 3 procedimientos almacenados y 6 vistas.
- **Normalización:** 3FN. Las condiciones de salud son un catálogo con una relación N:M (`usuario_condiciones`) y no columnas booleanas; el IMC es una **columna generada** (no se guarda un dato derivado digitado a mano); las contraindicaciones son una tabla N:M ejercicio × condición.
- **Integridad:** llaves foráneas con `ON DELETE` pensado caso por caso, `CHECK` (rangos de peso, estatura, RPE, dolor), `UNIQUE` y `ENUM`.
- **Lógica en la BD:**
  - `trg_medicion_actualiza_condicion`: al registrar el peso se asigna o retira BAJO_PESO, SOBREPESO u OBESIDAD.
  - `trg_rutina_ejercicio_seguro`: la BD rechaza un ejercicio contraindicado (`SIGNAL 45000`).
  - `trg_pagos_auditoria` y `trg_usuarios_auditoria`: trazabilidad en JSON.
  - `sp_simular_pago`: transacción con `ROLLBACK` ante error; la tarjeta terminada en 0000 se rechaza.
  - `sp_ejercicios_seguros`, `sp_cupo_ia`.
  - Vistas para dashboards: `v_usuario_resumen`, `v_progreso_corporal`, `v_adherencia_semanal`, `v_ingresos_mensuales`, `v_salud_servicios`, `v_uso_ia_diario`.
- **Índices** compuestos en las consultas de series de tiempo (`metricas`, `mediciones`, `sesiones`).
- **Probado:** el esquema y la semilla se ejecutaron sin errores; los triggers, procedimientos y vistas devuelven lo esperado.

### Consultas de demostración para la clase
```sql
-- 1. Ejercicios que Laura (sobrepeso + lumbar) SÍ puede hacer
CALL sp_ejercicios_seguros(3);

-- 2. Intentar meterle peso muerto → la BD lo bloquea
INSERT INTO rutina_ejercicios (rutina_dia_id, ejercicio_id, orden, series, repeticiones) VALUES (1, 5, 9, 3, 8);

-- 3. Registrar un peso normal → el trigger le quita SOBREPESO
INSERT INTO mediciones_corporales (usuario_id, peso_kg, estatura_cm) VALUES (3, 66, 165);
SELECT * FROM usuario_condiciones WHERE usuario_id = 3;

-- 4. Pago rechazado (simulado) → no se activa el plan
CALL sp_simular_pago(3, 'PREMIUM_MES', 'TARJETA', '0000', @id, @estado); SELECT @estado;

-- 5. Auditoría
SELECT * FROM auditoria;
```

---

## 8. Seguridad
- JWT en el header `Authorization: Bearer` (access 1 h, refresh 7 d). Móvil: los dos tokens en `expo-secure-store` (Keychain/Keystore cifrado). Escritorio: archivo cifrado con `safeStorage` de Electron (DPAPI de Windows). Web: el access token solo en memoria y el refresh en `localStorage` para sobrevivir a recargar la página; el riesgo de XSS se mitiga con la política CSP de Nginx (solo scripts propios).
- Las API keys solo viven en el `.env` del backend; **nunca** en web, móvil ni exe. Los `.env` están en `.gitignore` y en `.dockerignore` (no entran ni al repo ni a las imágenes).
- Contraseñas con hash y sal de Werkzeug (`scrypt` en las cuentas nuevas; los usuarios demo de `seed.sql` usan `pbkdf2:sha256`); mínimo 8 caracteres.
- Rate-limit: 5 intentos de login por minuto por IP y 3 generaciones de IA por minuto por usuario. Detrás de Nginx (`PROXY_SALTOS=1`) la IP real se toma de `X-Forwarded-For`; sin proxy ese encabezado se ignora para que nadie lo falsee.
- Validación de entrada con `pydantic` (`extra="forbid"`); consultas parametrizadas (sin SQL armado con strings).
- Mínimo privilegio en MySQL: la API usa `rol_api` (`SELECT, INSERT, UPDATE, DELETE, EXECUTE, SHOW VIEW`), nunca root. `SHOW VIEW` es necesario porque la API lee la definición de las vistas al arrancar.
- Pagos: solo se guardan los últimos 4 dígitos; se valida con el algoritmo de Luhn y se muestra en la interfaz que es un "modo demostración".
- Docker: Nginx es la única puerta de entrada (la API y el worker no publican puertos; MySQL solo en `3307` del PC para Workbench) y agrega `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff` y `Referrer-Policy`. Las claves por defecto de `docker-compose.yml` son solo para la demo local.
- `npm run api:lan` corre sin `--debug` (el depurador de Werkzeug permite ejecutar código) y el firewall de Windows se abre solo en el perfil Privado.
- Aviso legal visible: FitIA no reemplaza a un profesional de la salud.

### Verificación (etapa 7)
- `pytest`: 69 pruebas, también con un usuario de MySQL que solo tiene los permisos de `rol_api`.
- `backend/scripts/prueba_punta_a_punta.py`: 19 pasos de punta a punta, directo a la API y a través de Nginx.
- La web compilada se probó detrás de Nginx con la CSP activa: sin violaciones en la consola.
