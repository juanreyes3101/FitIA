# FitIA — Prompts para Claude Code, por etapa

Abre Claude Code **en la carpeta `FitIA/`** (allí está `CLAUDE.md`, que Claude Code lee solo). Envía un prompt por etapa, revisa el resultado, prueba y haz commit antes de seguir. Cada prompt es independiente: se puede usar en una sesión nueva.

> Requisitos en la PC: Git, Python 3.12, Node 20+, MySQL 8 (o XAMPP/MariaDB) o Docker Desktop, y Expo Go en el celular.

---

## Etapa 3 — Backend: API Flask + IA + validador

```
Lee CLAUDE.md, docs/02_arquitectura.md y database/schema.sql.

Construye el backend en backend/ siguiendo la estructura de la sección 3 de la arquitectura:
1. create_app() con config desde .env (ver .env.example), conexión MySQL con SQLAlchemy Core + PyMySQL (pool), manejo de errores con el formato único {"error": {"codigo", "mensaje"}}.
2. Auth con JWT (Flask-JWT-Extended), roles USUARIO/ENTRENADOR/ADMIN con un decorador @requiere_rol. Hash compatible con werkzeug (los usuarios demo de seed.sql deben poder entrar).
3. Todos los endpoints de la tabla de la sección 4, usando los procedimientos y vistas que ya existen en la BD (sp_ejercicios_seguros, sp_simular_pago, sp_cupo_ia, v_usuario_resumen, etc.).
4. Módulo ai/: interfaz AdaptadorIA con GeminiProvider (SDK google-genai, capa gratuita de AI Studio) y MockProvider (plantilla segura por reglas, sin internet). La salida se valida con el esquema pydantic de la sección 5. Circuit breaker: 3 fallos seguidos o un 429 (cuota gratis agotada) → Mock por 5 minutos. Respeta IA_MAX_SOLICITUDES_DIA y cachea la rutina 24 h. Al modelo solo se le envía el perfil anónimo (sin nombre, correo ni teléfono). RESTRICCIÓN: costo $0, no agregues ningún servicio ni librería de pago.
5. services/validador.py con las 7 reglas de la sección 5 como cadena de responsabilidad, más el flujo de reintentos (máx. 2) y el registro en solicitudes_ia.
6. Middleware de métricas que mide latencia y código HTTP por petición y escribe en la tabla metricas en lote.
7. Pruebas con pytest: validador (casos seguro / contraindicado / lumbar sin movilidad), login, generar rutina con AI_PROVIDER=mock, pago aprobado y rechazado (tarjeta 0000).
8. requirements.txt, wsgi.py, Dockerfile y un README corto en backend/.

Al terminar, corre las pruebas y muéstrame un ejemplo real de POST /rutinas/generar con el usuario laura@fitia.co.
```

## Etapa 4 — Web (React)

```
Lee CLAUDE.md y las pantallas de docs/diseno/web/.

1. Crea packages/shared con: tipos TypeScript de las entidades de la API, un cliente API (fetch con JWT y refresh) y los tokens de diseño (colores, tipografías, espaciado) tomados del sistema de diseño de FitIA.
2. Crea apps/web con Vite + React + TS + Tailwind (configura Tailwind con los tokens de shared) + React Router + Recharts.
3. Implementa el sitio público (landing, calculadora IMC, planes, sobre nosotros, login, registro) y la app del usuario (onboarding de 4 pasos, dashboard, mi rutina, detalle de ejercicio, modo entreno, progreso, lumbar, planes con pago simulado, perfil), fiel al diseño.
4. Estados de carga, vacío y error en cada pantalla; la etiqueta "Modo demostración" en el pago; el banner de publicidad solo en el plan Free.
5. Debe funcionar contra la API local (VITE_API_URL). Verifica en el navegador el flujo completo con laura@fitia.co.
```

## Etapa 5 — App móvil (Expo)

```
Lee CLAUDE.md y las pantallas de docs/diseno/movil/.

Crea apps/mobile con Expo + TypeScript + expo-router, reutilizando packages/shared (cliente API, tipos, tokens).
Tab bar: Hoy, Rutina, Progreso, Lumbar, Perfil. Implementa el onboarding, el modo entreno a pantalla completa (cronómetro de descanso con vibración usando expo-haptics, registro de RPE y dolor), las gráficas de progreso, la calculadora IMC y los planes con pago simulado en un bottom sheet.
Guarda el JWT con expo-secure-store. Configura EXPO_PUBLIC_API_URL para que funcione desde el celular en la misma red WiFi que la PC.
Para el APK (costo $0): configura EAS con el perfil "preview" (buildType apk), que usa el plan gratuito de Expo, y deja documentada también la alternativa 100 % local (npx expo prebuild + Android Studio → Build APK). No uses nada que requiera pagar ni la cuenta de Apple (iOS se prueba solo con Expo Go).
```

## Etapa 6 — Monitoreo autónomo + ejecutable de escritorio

```
Lee CLAUDE.md y la sección 6 de docs/02_arquitectura.md.

Parte A — backend/app/monitoring/:
1. Worker con APScheduler (proceso aparte: python -m app.monitoring.worker) que cada MONITOR_INTERVAL_SEG ejecute el ciclo MAPE-K:
   Monitor (leer metricas + psutil), Analizar (Pandas: EWMA y desviación en ventana, z-score, guardar lineas_base y anomalias), Planificar (politicas.py con enfriamiento y límites de réplicas), Ejecutar (simulado: actualizar servicios.replicas_actuales, cambiar AI_PROVIDER a mock si la IA falla, escribir acciones_remediacion) y verificar en el ciclo siguiente (anomalía → MITIGADA).
2. simulador.py: inyecta tráfico sintético con NumPy (base normal + pico) para POST /monitoreo/simular-pico.
3. Endpoints /monitoreo/* y pruebas del detector (serie sin pico → 0 anomalías; con pico de 5σ → 1 anomalía ALTA y una acción ESCALAR_ARRIBA).

Parte B — apps/desktop (Electron + React, reutilizando packages/shared), fiel a docs/diseno/escritorio/:
Login de admin, resumen, usuarios, entrenadores (cola de revisión), matriz de contraindicaciones editable, planes y anuncios, reportes con exportación a CSV, y la pantalla de MONITOREO con la gráfica en vivo (polling cada 5 s) de latencia con la banda μ ± 3σ, las anomalías marcadas, la línea de tiempo MAPE-K, la bitácora y el botón "Simular pico de tráfico".
Configura electron-builder para generar el instalador "FitIA Control Setup.exe" (npm run dist) con ícono.
```

## Etapa 7 — Integración, despliegue y entrega

```
Lee CLAUDE.md.
0. RESTRICCIÓN: costo $0. Nada de hosting pago. La demo corre en una PC del equipo; el celular se conecta por la misma WiFi. Si hace falta mostrarlo fuera de la red local, documenta un túnel gratuito (por ejemplo Cloudflare Tunnel, cuyo plan gratuito no pide tarjeta).
1. docker-compose.yml con mysql (que carga schema.sql y seed.sql al iniciar), api (gunicorn con 2 workers), worker de monitoreo y nginx como proxy inverso. Un solo comando: docker compose up.
2. Revisa la seguridad según la sección 8 de la arquitectura y corrige lo que falte.
3. Prueba de punta a punta: registro → onboarding → generar rutina → entrenar → ver progreso → pagar Pro (simulado) → el admin ve el pago y el monitoreo.
4. Actualiza el README raíz con la instalación paso a paso, las capturas y las credenciales demo.
5. Genera docs/04_manual_usuario.md y docs/05_guion_sustentacion.md (10 minutos, qué mostrar por materia).
6. Si los diagramas ya no coinciden con el código, actualiza las fuentes (.mmd, .puml, .bpmn) en docs/diagramas/.
```
