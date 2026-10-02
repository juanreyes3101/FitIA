# FitIA — Entrenamiento personalizado con IA

Plataforma web, app móvil y aplicación de escritorio que genera rutinas de ejercicio seguras según el IMC y las molestias de cada persona, pensada para gimnasios de barrio. Proyecto Integrador CUN 2026: **Bases de Datos · Arquitectura de Software · Innovación Tecnológica de Redes**.

Equipo: Juan Reyes · Juan Delgado · Vanesa Vargas · Santiago Castañeda

---

## Los 3 entregables y su función

| Entregable | Tecnología | Para quién | Qué hace |
|---|---|---|---|
| **Página web** | React + Vite | Visitantes y usuarios | Landing, IMC, planes, "Sobre nosotros" y toda la app del usuario |
| **App móvil** | React Native (Expo) → APK | Usuarios en el gimnasio | Rutina del día, modo entreno con cronómetro, progreso |
| **Ejecutable (.exe)** | Electron → `FitIA Control Setup.exe` | Admin y entrenadores | Gestión, reportes y **consola de monitoreo en vivo** |

Los tres consumen **una sola API** (Flask) conectada a **MySQL**.

## Qué aporta a cada materia

| Materia | Qué se muestra |
|---|---|
| **Bases de Datos** | Modelo ER de 27 tablas en 3FN, columna generada (IMC), 5 triggers (uno bloquea ejercicios peligrosos), 3 procedimientos con transacción, 6 vistas, auditoría en JSON → `database/`, `docs/diagramas/01` |
| **Arquitectura de Software** | Cliente-servidor en capas, una API para 3 clientes, patrones Strategy, Repository, Chain of Responsibility y Circuit Breaker; casos de uso, secuencia, BPMN, componentes y despliegue → `docs/02_arquitectura.md`, `docs/diagramas/02-06` |
| **Innovación en Redes** | Monitoreo autónomo MAPE-K: línea base dinámica (EWMA), detección de anomalías por z-score, auto-escalado y auto-remediación simulados, topología y despliegue → `docs/diagramas/04` y `07` |

---

## Plan por etapas

| Etapa | Qué | Herramienta | Estado |
|---|---|---|---|
| 0 | Organización: repo en GitHub, roles del equipo, cuentas | — | Por hacer |
| 1 | Diseño de identidad y pantallas (web, móvil, escritorio) | **Claude Design** → `docs/01_prompts_claude_design.md` | Prompts listos |
| 2 | Base de datos | MySQL Workbench → `database/` | ✅ Hecho y probado |
| 2b | Diagramas | `docs/diagramas/` | ✅ 7 diagramas |
| 3 | Backend: API + IA + validador | **Claude Code** → `docs/03_prompts_claude_code.md` | Prompt listo |
| 4 | Web | Claude Code | Prompt listo |
| 5 | App móvil + APK | Claude Code → `apps/mobile/` | ✅ App hecha · APK por generar (`apps/mobile/README.md`) |
| 6 | Monitoreo autónomo + ejecutable .exe | Claude Code | Prompt listo |
| 7 | Docker, pruebas de punta a punta, manual y guion de sustentación | Claude Code | Prompt listo |

Reparto sugerido (4 personas): **BD + reportes** · **Backend + IA** · **Web + escritorio** · **Móvil + monitoreo**. Todos revisan el diseño en la etapa 1.

---

## Presupuesto $0 — todo gratis, sin tarjeta

Restricción del equipo: **no se invierte nada**. Cada pieza tiene una opción gratuita que no pide tarjeta de crédito:

| Necesidad | Solución gratis | Notas |
|---|---|---|
| Código y trabajo en equipo | **GitHub** (repo privado) | Gratis; con el correo de la CUN pueden pedir GitHub Education |
| Base de datos | **MySQL Community + Workbench**, o **XAMPP** (MariaDB) | Software libre, corre en la PC |
| Backend | **Python + Flask** | Libre |
| Web, móvil y escritorio | **React, Expo y Electron** | Libres |
| **Inteligencia artificial** | **Google Gemini por AI Studio** (capa gratuita) + **modo Mock** | La llave se saca con una cuenta Google, sin tarjeta. **No activen la facturación** en Google Cloud: así nunca pueden cobrar. Si se acaba la cuota del día, FitIA pasa sola al modo Mock (rutina por reglas) y sigue funcionando |
| Probar la app en el celular | **Expo Go** | Gratis en Play Store / App Store |
| Generar el APK (Android) | **Plan gratuito de Expo (EAS)** o **Android Studio** en local | Ambos gratis. iOS no se empaqueta (exige la cuenta paga de Apple); en iPhone se muestra con Expo Go |
| Ejecutable .exe | **electron-builder** | Gratis (el instalador sale sin firma digital; Windows mostrará un aviso que se acepta con "Más información → Ejecutar de todas formas") |
| "Servidor" | **La PC de uno del equipo** (Docker Desktop o XAMPP) | El celular se conecta por la misma WiFi. Para mostrarlo fuera de la red local: túnel gratuito (Cloudflare Tunnel) |
| Diagramas | Mermaid, PlantUML, bpmn.io | Libres (ya están hechos) |
| Diseño | Claude Design | Con la cuenta de Claude que ya usan |
| Pagos | **Simulados** | No se necesita pasarela |
| Fotos e íconos | Unsplash, Pexels, Lucide | Licencias gratuitas |

**Cuidados con la capa gratuita de Gemini:** tiene límites de peticiones por minuto y por día. Por eso el backend cachea las rutinas, pone un tope diario (`IA_MAX_SOLICITUDES_DIA`) y solo le envía a Google un perfil anónimo (nunca el nombre ni el correo), porque Google puede usar los datos de la capa gratuita para mejorar sus productos.

## Arranque rápido (base de datos, ya disponible)

```bash
mysql -u root -p < database/schema.sql
mysql -u root -p fitia < database/seed.sql
```
Usuarios demo: `admin@fitia.co / Admin2026*` · `coach@fitia.co / Demo2026*` · `laura@fitia.co / Demo2026*` · `andres@fitia.co / Demo2026*`

## Estructura

```
FitIA/
├── CLAUDE.md            contexto para Claude Code
├── README.md            este archivo
├── .env.example         variables y llaves
├── database/            schema.sql · seed.sql
└── docs/
    ├── 01_prompts_claude_design.md
    ├── 02_arquitectura.md
    ├── 03_prompts_claude_code.md
    └── diagramas/       PNG · SVG · fuentes (.mmd .puml .bpmn)
```
(`backend/`, `apps/` y `packages/` los crea Claude Code desde la etapa 3).
