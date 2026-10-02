# Etapa 4: `packages/shared` + `apps/web` (React + Vite + TS + Tailwind)

> **Para una sesión nueva:** las decisiones de la sección 2 ya están confirmadas por el usuario. No las vuelvas a preguntar.
> El primer paso al implementar es copiar este plan a `docs/plan_etapa4_web.md` (lo pidió el usuario).

## 1. Contexto
El backend (Etapa 3, commit `40c4dfe`) ya funciona: Flask `/api/v1`, JWT, IA mock/gemini, pagos simulados. Falta el primer cliente. La Etapa 4 (`docs/03_prompts_claude_code.md`) pide:
- `packages/shared`: tipos, cliente API con JWT y refresh, tokens de diseño.
- `apps/web`: sitio público y app del usuario, fieles a `docs/diseno/web/` y `docs/diseno/comun/`, conectados a la API real.

Reglas del pedido:
- No inventar endpoints.
- Usar los datos demo de laura@fitia.co.
- No lanzar subagentes.
- Orden de prioridad si se acaban los créditos:
  1. Sitio público (landing, IMC, planes, sobre nosotros, login)
  2. Onboarding
  3. Dashboard
  4. Mi rutina
  5. Modo entreno
  6. Progreso
  7. Planes con pago
  8. Lumbar
  9. Perfil

## 2. Decisiones confirmadas
1. **Brechas del backend:** se resuelven con cambios aditivos mínimos y **sin endpoints nuevos**:
   - `GET /perfil` suma `cupo_ia_restante` (reusa `repositories/solicitudes_ia.cupo_restante` → `sp_cupo_ia`).
   - `PUT /perfil` acepta, opcionales, `fecha_nacimiento` y `sexo`. Se guardan en `usuarios` con `repositories/usuarios.actualizar`, así que el esquema no cambia.
   - Va con una prueba nueva `backend/tests/test_perfil.py` y se actualiza la fila de `/perfil` en `docs/02_arquitectura.md`.
2. **Perfil:** las acciones que no tienen endpoint se ven pero quedan deshabilitadas, con la etiqueta "Próximamente":
   - editar nombre, correo y celular
   - cambiar contraseña
   - borrar mis datos
   - "Volver a Free"

   "Descargar mis datos" **sí funciona**: arma el JSON en el cliente con `GET /perfil`, `/rutinas/activa` y `/progreso?dias=730`.
3. **Verificación:** Laura se usa **solo para leer**: login, dashboard, rutina, progreso, lumbar y un pago **rechazado** con una tarjeta que termina en 0000. Un usuario de prueba nuevo hace las escrituras: registro → onboarding → generar → entrenar → pagar Pro aprobado. Los datos demo de Laura no se tocan.

## 3. Hallazgos (lo que se verificó en el código)
**Tokens del diseño** (`comun/FitIA Marca.dc.html`):
- Colores:
  - Asfalto `#0B0B0C` · Concreto `#1A1A1D` · Grafito `#2A2A2E` (nunca texto)
  - Niebla `#9A9AA0` · Hueso `#F2F0EB`
  - Voltaje `#D4FF00` (hover `#E1FF4D`, sombra `#7E9900`) · Señal `#FF4D1A`
  - Éxito `#3DDC84` · Advertencia `#FFB020` · Error `#FF3B3B`
- Fuentes: Anton (títulos, siempre en mayúsculas), Inter Tight (texto e interfaz), JetBrains Mono (cifras tabulares). Se cargan de Google Fonts, que es gratis.
- Espaciado en escala de 4 px.
- Radios máximos de 4 px: nada de píldoras.
- Sombras:
  - "golpe": `0 4 0 #7E9900`; al presionar baja a 2 px
  - "bloque": `4 4 0 Grafito`
  - "flotante"
  - "anillo de foco": 2 px Asfalto + 2 px Voltaje
- Movimiento: 90 ms, 600 ms y 900 ms, con curva `cubic-bezier(.2,.8,.2,1)`. Se respeta `prefers-reduced-motion`.
- Área táctil de 44 px como mínimo; los botones de la app miden 52 px de alto.
- Corte diagonal de 7° y "cinta de obra", una vez por pantalla.

**Contrato real de la API** (leído en `backend/app/api/*` y `services/*`):
- `POST /auth/login` y `/auth/registro` devuelven `{usuario, access_token, refresh_token, expira_en_seg}`.
- `POST /auth/refresh` funciona con el refresh token en el header Bearer.
- El refresh viaja en el cuerpo de la respuesta, no en una cookie httpOnly. Por eso, en la web, el access token vive en memoria y el refresh en `localStorage`. Esta desviación de la §8 de la arquitectura queda documentada en `apps/web/README.md`.
- El registro exige `nombres`, `apellidos` y `acepta_terminos`. El diseño solo pide "Nombre", así que se agrega el campo "Apellidos". Las dos casillas del diseño (términos y tratamiento de datos) mandan `acepta_terminos=true`.
- Rate-limit: 5 logins por minuto por IP y 3 generaciones por minuto. En las pruebas manuales no hay que repetir el login a lo loco.
- Errores con la forma `{error:{codigo,mensaje}}`. El cliente lanza `ApiError(codigo, mensaje, status)` y la interfaz muestra `mensaje`, que ya viene en español.
- Un pago rechazado responde **200** con `estado:"RECHAZADO"`. Agotar el cupo responde `402 CUPO_IA_AGOTADO`. Sin rutina responde `404 SIN_RUTINA`, que es el estado vacío. Sin perfil, `400 PERFIL_INCOMPLETO` → se manda al onboarding.
- `GET /anuncios` devuelve `{anuncio:null}` en Pro. El banner solo se muestra si `perfil.plan.con_publicidad`.

**Mapeo de los valores del diseño a los enums de la API:**

| Campo | Diseño → API |
|---|---|
| Nivel de actividad | Sedentaria→`SEDENTARIO`, Algo activa→`LIGERO`, Activa→`MODERADO`, Muy activa→`ACTIVO` |
| Objetivo | Bajar de peso→`BAJAR_PESO`, Ganar fuerza→`GANAR_MASA`, Tonificar→`TONIFICAR`, Más energía→`SALUD_GENERAL`, Movilidad→`ALIVIAR_LUMBAR` |
| Molestias | Lumbar→`DOLOR_LUMBAR`, Rodilla→`DOLOR_RODILLA`, Hipertensión→`HIPERTENSION`, Ninguna→`[]` |
| Severidad | Leve→1, Moderada→2, Alta→3 |
| Lugar | No aparece en el diseño → `GIMNASIO` |
| Sexo | Mujer→`F`, Hombre→`M`, Otro→`O`, Prefiero no decir→`N` |

- Las condiciones de origen IMC (sobrepeso y demás) las asigna el trigger al hacer `POST /perfil/mediciones`. Nunca se mandan en `PUT /perfil`.

**Datos del diseño que la API no tiene, y cómo se resuelven sin inventar nada:**
- En el detalle de ejercicio no hay "músculos", "errores comunes" ni "por qué":
  - Se muestran `grupo` y `equipo` (de `GET /ejercicios`).
  - "Paso a paso" sale de partir `instrucciones` por frases.
  - "Por qué lo elegimos" usa `notas` del `rutina_ejercicio` o la explicación de la rutina (`observaciones_validacion`).
  - La sección de errores se oculta si no hay datos.
- No hay `GET /ejercicios/{id}`: el detalle sale de `rutinas/activa` o de la lista `GET /ejercicios`.
- No hay historial de sesiones por día. La racha y la tira de la semana se derivan de `adherencia_semanal`: sesiones por semana contra una meta de `dias_disponibles`. La sesión recién hecha se marca en estado local.
- Video: no hay `video_url` en la semilla, así que el bloque queda como placeholder sin reproductor falso.
- Planes: `GET /planes` trae `GRATIS`, `PREMIUM_MES` (19.900) y `PREMIUM_ANUAL` (199.000). El interruptor Mensual/Anual elige entre `PREMIUM_MES` y `PREMIUM_ANUAL`.
- PSE y Nequi: el formulario valida en el cliente según el diseño y manda `metodo` **sin** datos bancarios. Para tarjeta se manda `numero_tarjeta`; el backend aplica Luhn y solo guarda los últimos 4 dígitos. El nombre, la fecha de vencimiento y el CVV **nunca se envían**: solo se validan en el cliente.

**Entorno:**
- Node 24.14 y npm 11. Workspaces de npm, sin herramientas extra.
- `CORS_ORIGINS` del backend ya incluye `http://localhost:5173`.
- `*.env` está en `.gitignore`, así que el repo lleva `apps/web/.env.example` con `VITE_API_URL=http://localhost:5000/api/v1`.

## 4. Estructura

```
package.json                 ← workspaces: ["packages/*", "apps/*"] (privado, sin dependencias propias)
packages/shared/
  package.json               ← "@fitia/shared", "main": "src/index.ts" (se consume como TS fuente; Metro lo podrá usar en la Etapa 5)
  src/tipos.ts               ← Usuario, Tokens, Perfil, Condicion, Medicion, Rutina/RutinaDia/RutinaEjercicio,
                               Ejercicio, Progreso, Plan, Pago, Anuncio, ImcResultado, ErrorApi, enums
  src/cliente.ts             ← crearClienteApi({baseUrl, almacen}) : fetch + Bearer + refresh automático en 401 SESION_EXPIRADA
                               (un solo refresh en curso, reintenta 1 vez; si falla → onSesionCerrada) + ApiError
  src/almacen.ts             ← interfaz AlmacenTokens (web: memoria + localStorage; móvil luego: secure-store)
  src/endpoints.ts           ← funciones tipadas: auth.login/registro, imc, perfil.obtener/actualizar/medicion,
                               ejercicios.listar/seguros, rutinas.generar/activa, sesiones.registrar, progreso,
                               planes, pagos.simular, anuncios
  src/tokens.ts              ← colores, fuentes, tamaños, espaciado, radios, sombras, movimiento (sección 3)
  src/mapeos.ts              ← tablas diseño↔enum de la sección 3 + clasificarImc (misma regla OMS)
  src/index.ts
apps/web/
  package.json, vite.config.ts, tsconfig.json, tailwind.config.ts (importa tokens de @fitia/shared), postcss.config.js
  index.html (Google Fonts), .env.example, README.md
  src/main.tsx, src/App.tsx (React Router)
  src/api.ts                 ← instancia del cliente con VITE_API_URL
  src/auth/SesionContext.tsx ← usuario, login/logout/registro, perfil cacheado; RutaPrivada (rol USUARIO)
  src/ui/                    ← Boton (primario con sombra golpe / secundario / fantasma), Campo, Tarjeta, Etiqueta,
                               Chip, Logo (SVG del diseño), Medidor IMC, Cargando, Vacio, ErrorEstado, Toast,
                               AvisoSalud, BannerAnuncio, CorteDiagonal
  src/publico/               ← NavPublica, Footer, Inicio, CalculadoraImc, Planes, SobreNosotros, Ingresar (login+#registro)
  src/app/                   ← AppLayout (sidebar escritorio / tab bar celular + cupo IA), Onboarding, Dashboard,
                               Rutina, Ejercicio, Entreno, Progreso, PlanesApp (pago), Lumbar, Perfil
```

Versiones:
- React 18, Vite 5 y TypeScript 5
- Tailwind **3.4**: se elige porque permite importar los tokens TS en `tailwind.config.ts`
- react-router-dom 6 y Recharts 2

Todo es libre y gratis.

## 5. Pasos (en el orden de prioridad del usuario)

**Paso 0. Guardar el plan:** copiar este archivo a `docs/plan_etapa4_web.md`.

**Paso 1. Backend aditivo (decisión 1), pequeño y primero porque el onboarding lo necesita:**
- `services/perfil.obtener`: agregar `"cupo_ia_restante"` y `"sexo"` y `"fecha_nacimiento"` del usuario.
- `api/esquemas.PerfilEntrada`: agregar `fecha_nacimiento: date | None` y `sexo: Literal[...] | None`, con edad entre 14 y 90 según el diseño.
- `services/perfil.actualizar`: si vienen esos campos, `repo_usuarios.actualizar(conn, uid, {...})` en la misma transacción y se excluyen de `guardar_perfil`.
- `tests/test_perfil.py`, con un usuario descartable `test_*@pruebas.fitia.co`, igual que en `conftest.py`. Cubre:
  - GET con el cupo
  - PUT con sexo y fecha
  - fecha fuera de rango → 400
- Actualizar la fila `/perfil` en `docs/02_arquitectura.md`.
- Correr `pytest` completo.

**Paso 2. `packages/shared` + esqueleto de `apps/web`:**
- Workspaces y configuración de Vite, Tailwind, Router y Recharts.
- Cliente API con refresh, `SesionContext` y los componentes de `ui/`.
- Ver `npm run dev`, `tsc --noEmit` y `npm run build` en verde.

**Paso 3. Sitio público** (diseño: `FitIA Inicio`, `Calculadora IMC`, `Planes`, `Sobre nosotros`, `Ingresar`, `comun/FitiaNav`, `FitiaFooter`, `FitiaIMC`):
- **NavPublica**: de 88 px transparente pasa a 64 px con borde al hacer scroll a más de 40 px; en celular, menú de pantalla completa.
- **Inicio**:
  - hero "Tu rutina. Tu cuerpo. Tu barrio."
  - marquesina
  - "Cómo funciona" en 3 pasos
  - IMC embebido
  - tarjetas lumbar
  - resumen de planes desde `GET /planes`
  - aviso de salud
- **Calculadora IMC**:
  - sliders de peso y estatura
  - cálculo local instantáneo con la regla OMS de `mapeos.ts`
  - confirmación con `GET /imc` (con debounce), que muestra `mensaje` y `aviso`
  - tabla OMS y "Lo que el IMC no te dice"
  - CTA "Crear cuenta gratis" que lleva el peso y la estatura en el state a `/ingresar#registro` y luego al onboarding
- **Planes**:
  - interruptor Mensual/Anual
  - tarjetas desde `GET /planes`, con precio en COP formateado `es-CO`
  - tabla "Cara a cara" y preguntas frecuentes, con contenido estático del diseño
- **Sobre nosotros**: contenido estático, con los 4 integrantes de CLAUDE.md.
- **Ingresar**:
  - pestañas Ingresar / Crear cuenta (`#registro`)
  - validación en vivo y medidor de contraseña con los textos del diseño
  - casillas de términos y datos (Ley 1581)
  - después del login: ADMIN o ENTRENADOR ven el mensaje "Usa FitIA Control (escritorio)"
  - USUARIO va a `/app`, o a `/app/onboarding` si `perfil.perfil` es null

**Paso 4. App del usuario.** `AppLayout` según `FitIA App.dc.html`: sidebar con 7 ítems y la tarjeta "RUTINAS IA · MES x/y" (usa `cupo_ia_restante` y `plan.rutinas_ia_mes`); en celular, tab bar abajo. Cada pantalla tiene estados de **cargando, vacío y error** con reintento.

| # | Pantalla | Endpoints | Notas |
|---|---|---|---|
| 1 | Onboarding (4 pasos) | `PUT /perfil`, `POST /perfil/mediciones`, `POST /rutinas/generar` | Paso 1: nombre de solo lectura (de la cuenta), edad → `fecha_nacimiento` aproximada (1 de enero del año calculado) y sexo. Paso 2: peso y estatura con ± e IMC en vivo sobre la barra de 4 segmentos. Paso 3: actividad y objetivo. Paso 4: molestias, severidad (aviso médico si es Alta o si hay hipertensión), días (1–7) y minutos (10–180). Al terminar: medición → perfil → generar, con la animación de 4 mensajes "La IA está armando tu rutina…". Si responde `proveedor:"mock"`, se muestra el aviso de "rutina base segura". Si hay 402, se guarda el perfil y se ofrece Pro. |
| 2 | Dashboard | `GET /perfil`, `/rutinas/activa`, `/progreso?dias=60`, `/anuncios?ubicacion=BANNER_HOME` | Saludo con la fecha en `es-CO`. "Entreno de hoy" es el siguiente día de la rutina, con rotación simple según las sesiones de la semana. Tarjeta IMC con medidor y diferencia desde la primera medición. Gráfica de peso (Recharts). Barras de adherencia y racha. Cupo IA. Tarjeta lumbar. Banner **solo si `con_publicidad`**. Estado vacío "Aún no tienes rutina" → onboarding. |
| 3 | Mi rutina | `GET /rutinas/activa`, `POST /rutinas/generar` | Encabezado "N días. M minutos." con chips de objetivo, molestia y nivel. Selector de días. Lista con dosis (series × reps o duración), descanso, tipo y sello "SEGURO PARA TU ESPALDA" (`apto_lumbar`) o "CUIDA LA POSTURA". Botón "Generar nueva" con el cupo; 402 → aviso con "Pásate a Pro". Muestra `explicacion` o `observaciones_validacion`. Badge de origen (IA / base segura / desde caché). |
| 3b | Detalle de ejercicio | datos de la rutina activa o de `GET /ejercicios` | Ver los datos faltantes en la sección 3. Si el id no existe → estado "No encontramos este ejercicio". |
| 4 | Modo entreno | `GET /rutinas/activa`, `POST /sesiones`, `/anuncios?ubicacion=ENTRE_EJERCICIOS` (solo Free) | Cronómetro total. Serie N/M, "Serie lista", descanso con cuenta regresiva y "+15 s" / "Saltar". Modal "¿Terminar el entreno?". Evaluación con RPE 1–10 y dolor 0–10 usando las etiquetas del diseño. Se envía `{rutina_dia_id, duracion_min, esfuerzo_percibido, dolor_reportado, completada, ejercicios[{ejercicio_id, series_hechas}]}`. Si `alerta_dolor` → pantalla "CUIDÉMONOS" con movilidad sugerida (ejercicios `apto_lumbar` de MOVILIDAD de la rutina o del catálogo) y aviso médico. Si no → "¡Sesión lista!". |
| 5 | Progreso | `GET /progreso?dias=30\|90\|365` | Rangos 30/90/365. KPIs: peso, IMC, sesiones por semana contra la meta y dolor promedio. Gráficas Recharts: peso (línea), IMC (con bandas OMS), sesiones por semana (barras con meta) y dolor (barras con línea de alerta en 5). Estado vacío del diseño. |
| 6 | Planes con pago | `GET /planes`, `/perfil`, `POST /pagos/simular` | Banner fijo **"Modo demostración: no se realizan cobros reales."** Mensual/Anual. Formulario por método (tarjeta / PSE / Nequi) con validaciones del diseño. Resumen con IVA incluido (19 % desglosado). "Procesando…", luego APROBADO ("¡Ya eres Pro!" + `referencia`) o RECHAZADO (motivo + "Intentar otra vez" / "Usar PSE o Nequi"). Después se refresca el perfil para que desaparezcan los anuncios. Si ya es Pro: "Activo hasta `fecha_fin`". |
| 7 | Zona lumbar | `GET /ejercicios?lumbar=true`, `GET /ejercicios/seguros` | Búsqueda sin tildes, filtros por tipo y nivel, interruptor "Solo seguros para mí" (intersección con los ids de `/seguros`), sello verde y estado vacío "Nada por aquí". |
| 8 | Perfil | `GET/PUT /perfil`, `POST /perfil/mediciones` | Tus datos: nombre, correo y celular de solo lectura ("Próximamente"). Peso y estatura → "Guardar cambios" crea una medición. Molestias, severidad, días y minutos → "Actualizar" (PUT). Contraseña y "Borrar mis datos" deshabilitados ("Próximamente"). "Descargar mis datos" en JSON del lado del cliente. Plan y su CTA. Cerrar sesión. Aviso de la Ley 1581. |

**Paso 5. Cierre:**
- `apps/web/README.md`: cómo correrlo, variables y las desviaciones (refresh en localStorage, campos "Próximamente").
- Actualizar CLAUDE.md o el README raíz solo si cambia algún comando.
- Verificación (sección 6).
- No hago commit hasta que el usuario lo pida.

## 6. Verificación
1. `cd backend && .venv\Scripts\python -m pytest`: todo en verde, incluido `test_perfil.py`.
2. `npm install` en la raíz, y luego `npm -w apps/web run build` y `npx tsc --noEmit -p apps/web`: sin errores.
3. Levantar la API (`cd backend && .venv\Scripts\flask --app wsgi run`, con `AI_PROVIDER=mock`) y `npm -w apps/web run dev`.
4. En el navegador (Claude in Chrome), en una pestaña nueva:
   - **Público:**
     - navegar Inicio → IMC (78 kg y 165 cm deben dar 28,65, SOBREPESO) → Planes (precios reales) → Sobre nosotros
     - revisar el ancho de 390 px (menú móvil)
   - **Laura (solo lectura):**
     - login → el dashboard muestra su rutina "Arranque seguro — espalda fuerte", el IMC, la gráfica de 3 mediciones y el banner de publicidad (Free)
     - Mi rutina → detalle de ejercicio → Progreso → Zona lumbar con "Solo seguros" (no aparece peso muerto)
     - Planes: pagar con la tarjeta de prueba `4111 1111 1111 0000` (o cualquier número que pase Luhn y termine en 0000) → **RECHAZADO**, y sigue en Free
     - Perfil: descargar el JSON
     - Si tiene el cupo en 0, "Generar" muestra el aviso 402 sin romper nada
   - **Usuario de prueba** (`web_demo_<fecha>@pruebas.fitia.co`):
     - registro → onboarding de 4 pasos → rutina generada (mock) → modo entreno completo con dolor 7 → pantalla "CUIDÉMONOS"
     - Progreso con 1 sesión
     - pagar Pro con `4111 1111 1111 1111` → APROBADO → el banner desaparece
   - Estados de error: con la API apagada, cada pantalla muestra el estado de error con "Reintentar".
   - Revisar la consola del navegador sin errores. GIF del flujo de Laura (`fitia_web_laura.gif`).
5. Al final: dejar al usuario de prueba o borrarlo con `DELETE FROM usuarios WHERE email LIKE 'web_demo_%@pruebas.fitia.co'`, que borra en cascada. Se le pregunta al usuario antes.

## 7. Riesgos
- **Rate-limit de login (5/min):** en la verificación se reutiliza la sesión y no se hace login repetido.
- **Fidelidad visual:** los `.dc.html` son la referencia de estilos en línea. Se trasladan a clases Tailwind con los tokens. Las fotos duotono del diseño son "image slots" vacíos, así que se usan bloques gráficos con patrones CSS, sin imágenes de stock.
- **Créditos:** si se acaban, se sigue estrictamente el orden del paso 3 → paso 4 (1…8), y cada pantalla terminada queda usable por sí sola.
