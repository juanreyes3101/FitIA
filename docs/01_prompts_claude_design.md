# FitIA — Prompts para Claude Design

**Cómo usarlos:** envíalos **en orden**, uno por mensaje, dentro del **mismo** proyecto de Claude Design. El Prompt 0 define el sistema visual y los demás lo reutilizan. Antes de pasar al siguiente, revisa y pide los ajustes que haga falta.
Al final exporta cada pantalla (PNG/PDF) y guárdala en `docs/diseno/` para que Claude Code la use como referencia.

> Smart Fit y Bodytech se usan **solo como referencia de estructura** (cómo organizan planes, sedes, clases y CTA). No copiamos su logo, sus colores ni sus textos. FitIA tiene identidad propia.

---

## Prompt 0 — Sistema de diseño (enviar primero)

```
Vas a diseñar la identidad visual y el sistema de diseño de FitIA, una plataforma de entrenamiento físico personalizado con inteligencia artificial pensada para gimnasios de barrio en Bogotá (estratos 1, 2 y 3). Es un proyecto universitario (Ingeniería de Sistemas, CUN) que tendrá: sitio web, app móvil y una aplicación de escritorio para administración y monitoreo.

CONCEPTO: "Gym urbano". Calle, concreto, energía, ritmo. Que se sienta como entrenar en un gimnasio de barrio con buena música, no como una app médica ni como un spa. Dinámico, con movimiento, directo, cercano. Nada de estética corporativa genérica.

REFERENCIAS DE ESTRUCTURA (no de marca): la forma en que Smart Fit y Bodytech presentan planes, beneficios y llamados a la acción en su web y app. Toma la claridad de esa estructura y dale una identidad urbana propia.

PALETA (modo oscuro por defecto, con versión clara):
- Asfalto #0B0B0C (fondo principal)
- Concreto #1A1A1D (tarjetas)
- Grafito #2A2A2E (bordes, divisores)
- Niebla #9A9AA0 (texto secundario)
- Hueso #F2F0EB (texto principal / fondo del modo claro)
- Voltaje #D4FF00 (acento principal: CTA, progreso, datos clave)
- Señal #FF4D1A (acento secundario: alertas, intensidad, "en vivo")
- Estados: éxito #3DDC84, advertencia #FFB020, error #FF3B3B

TIPOGRAFÍA:
- Titulares: Anton (condensada, en MAYÚSCULAS, gran tamaño, interlineado apretado)
- Texto: Inter Tight
- Números y métricas (IMC, kg, series, cronómetros): JetBrains Mono

LENGUAJE GRÁFICO:
- Cortes diagonales en bloques y secciones (ángulos de 6-8°)
- Textura sutil de grano o concreto en los fondos grandes (que no ensucie)
- Cinta tipo "señal de obra" (diagonales negras y Voltaje) como elemento decorativo, con moderación
- Números enormes de fondo como elemento gráfico (por ejemplo "01", "IMC", "24/7")
- Fotografía: personas reales de barrio entrenando, luz dura, alto contraste, tratamiento duotono (negro + Voltaje). Diversidad de cuerpos: no solo atletas, también personas con sobrepeso y principiantes.
- Iconos: de trazo, grosor 2 px, esquinas rectas
- Bordes: radio 4 px (casi rectos), nada redondeado tipo burbuja
- Microinteracciones: botones que se "presionan" (desplazamiento 2 px), barras de progreso que se llenan, contadores que suben

COMPONENTES A DEFINIR (muéstralos en una hoja de componentes):
botón primario / secundario / fantasma, inputs con validación, selector de opciones en "chips", tarjeta de ejercicio, tarjeta de plan, medidor de IMC (barra segmentada bajo peso / normal / sobrepeso / obesidad), gráfica de progreso, badge de estado, barra de navegación web, tab bar móvil, toasts, modal, estado vacío, skeleton de carga.

ACCESIBILIDAD: contraste AA mínimo, texto base 16 px, áreas táctiles de 44 px o más.

TONO DE LOS TEXTOS: español colombiano, cercano, motivador sin exagerar. Tuteo. Ejemplos: "Arranca hoy", "Tu rutina, a tu medida", "Sin excusas, sin costo".

Entrega: hoja de estilo (colores, tipografía, espaciado en escala de 4 px, sombras, radios), hoja de componentes y el logo de FitIA (wordmark en Anton + un símbolo simple que combine una pesa o un pulso con un toque de "IA"; debe funcionar en un solo color).
```

---

## Prompt 1 — Sitio web público (landing + páginas abiertas)

```
Usando el sistema de diseño de FitIA que ya definimos, diseña el SITIO WEB PÚBLICO en escritorio (1440 px) y su versión responsive en celular (390 px).

PÁGINAS:
1. Landing (home), en este orden:
   - Navbar fija: logo, Cómo funciona, Calculadora IMC, Planes, Sobre nosotros, botones "Ingresar" y "Empieza gratis".
   - Hero a pantalla completa: titular gigante "TU RUTINA. TU CUERPO. TU BARRIO.", subtítulo "Rutinas creadas con inteligencia artificial según tu peso, tu estatura y tus molestias. Gratis.", CTA "Empieza gratis", foto duotono de alguien entrenando, contador animado ("+1.200 rutinas generadas").
   - Franja tipo cinta en movimiento (marquee) con palabras: FUERZA · CONSTANCIA · BARRIO · SIN EXCUSAS.
   - "Cómo funciona" en 3 pasos numerados grandes: 01 Cuéntanos de ti · 02 La IA arma tu rutina · 03 Entrena y mide tu progreso.
   - Calculadora de IMC embebida (peso y estatura; resultado con el medidor segmentado y un mensaje).
   - Sección "Cuidamos tu espalda": ejercicios para molestia lumbar, con 3 tarjetas de ejemplo.
   - Planes: FitIA Free ($0, con publicidad, 2 rutinas IA al mes) y FitIA Pro ($19.900/mes o $199.000/año, sin publicidad, 10 rutinas IA al mes). Destaca que el plan gratis es completo.
   - Testimonios ilustrativos (marcados como ejemplo).
   - Bloque "Disponible en web y celular" con mockup de la app.
   - Footer: enlaces, redes, aviso de tratamiento de datos (Ley 1581 de 2012), "Proyecto Integrador CUN 2026".
2. Calculadora IMC (página completa): explicación de qué es el IMC, sus límites y la invitación a registrarse.
3. Planes (comparativa detallada en tabla).
4. Sobre nosotros: el problema (sedentarismo y falta de acompañamiento profesional en gimnasios de estratos bajos), la misión, el equipo (Juan Reyes, Juan Delgado, Vanesa Vargas, Santiago Castañeda, estudiantes de Ingeniería de Sistemas de la CUN) y la tecnología (IA, web, app, monitoreo).
5. Login y Registro (formulario corto + aceptación de términos y tratamiento de datos).

Muestra estados hover y foco, y el comportamiento al hacer scroll (navbar que se compacta, secciones que aparecen con un desplazamiento diagonal).
```

---

## Prompt 2 — Web app del usuario (después de iniciar sesión)

```
Con el mismo sistema de diseño, diseña la APLICACIÓN WEB DEL USUARIO (escritorio 1440 px con barra lateral, y su versión de celular de 390 px).

Usuario de ejemplo: Laura Gómez, 28 años, 78 kg, 1,65 m, IMC 28,65 (sobrepeso), molestia lumbar moderada, sedentaria, objetivo bajar de peso, 3 días por semana de 45 min, plan Free.

PANTALLAS:
1. Onboarding en 4 pasos con barra de progreso: (a) datos básicos, (b) peso y estatura con el IMC calculado en vivo, (c) nivel de actividad y objetivo en chips grandes, (d) molestias (lumbar, rodilla, hipertensión, ninguna) con severidad y días/minutos disponibles. Cierre: animación "La IA está armando tu rutina…".
2. Dashboard: saludo, tarjeta "Entreno de hoy" con CTA, racha semanal, IMC actual con medidor, gráfica de peso de 60 días (81 → 79,5 → 78 kg), adherencia semanal, banner publicitario (solo plan Free) y aviso de cupo IA restante ("Te queda 1 rutina IA este mes").
3. Mi rutina: vista semanal por días (Día 1 Cardio suave + core · Día 2 Fuerza tren inferior · Día 3 Movilidad lumbar), cada ejercicio con series × repeticiones o duración, descanso y un sello "Seguro para tu espalda" cuando aplique. Botón "Generar nueva rutina con IA".
4. Detalle de ejercicio: imagen o video, pasos, músculos trabajados, errores comunes, y una explicación de por qué se eligió para ella.
5. Modo entreno (sesión en curso): ejercicio actual en grande, cronómetro de descanso circular, botón "Serie lista", al final escala de esfuerzo (RPE 1-10) y de dolor (0-10). Si el dolor es mayor a 5, mostrar un mensaje de cuidado y la sugerencia de movilidad.
6. Progreso: peso, IMC, sesiones por semana, dolor promedio; filtros de 30, 90 y 365 días.
7. Ejercicios para zona lumbar: biblioteca filtrable.
8. Planes y pago SIMULADO: checkout con tarjeta, PSE o Nequi, una etiqueta visible "Modo demostración: no se realizan cobros reales", estados de éxito y de rechazo (tarjeta terminada en 0000).
9. Perfil y configuración: datos, molestias, cambio de contraseña, descarga y borrado de mis datos.

Incluye estados vacíos, de carga y de error (por ejemplo, "La IA no respondió, usamos una rutina base segura").
```

---

## Prompt 3 — App móvil

```
Con el mismo sistema de diseño, diseña la APP MÓVIL nativa de FitIA (iPhone 390 × 844 y Android 360 × 800). Es la que la gente usa DENTRO del gimnasio: pensada para una mano, botones grandes y legible a un metro de distancia.

Tab bar inferior: Hoy · Rutina · Progreso · Lumbar · Perfil.

PANTALLAS:
1. Splash + onboarding (los mismos 4 pasos de la web, adaptados a pantalla completa con gestos de deslizar).
2. Hoy: tarjeta enorme "Entreno de hoy" con CTA "EMPEZAR", racha, IMC y un mini resumen.
3. Rutina: días en pestañas horizontales y lista de ejercicios con miniatura.
4. Modo entreno a pantalla completa: ejercicio actual, contador de series, cronómetro de descanso con vibración, deslizar para pasar al siguiente, botón de pausa; al final, el registro de RPE y dolor.
5. Detalle de ejercicio con video en bucle.
6. Progreso: gráficas táctiles (peso, IMC, adherencia) y logros desbloqueados.
7. Lumbar: rutina rápida de 10 minutos para la espalda y la biblioteca de ejercicios.
8. Calculadora IMC.
9. Planes y pago simulado (hoja inferior / bottom sheet).
10. Perfil.
11. Notificación push de ejemplo: "Laura, hoy toca Día 2: tren inferior 💪".

Muestra la app en modo oscuro (principal) y una pantalla en modo claro como muestra.
```

---

## Prompt 4 — Aplicación de escritorio (ejecutable): administración + consola de monitoreo

```
Con el mismo sistema de diseño, diseña "FitIA Control", la APLICACIÓN DE ESCRITORIO para Windows (1366 × 768 y 1920 × 1080) que usan el administrador y los entrenadores. Debe sentirse como una sala de control: densa en datos pero ordenada. Barra lateral izquierda con iconos y textos, y barra superior con el estado global ("Todos los sistemas operativos" en verde, o "2 anomalías abiertas" en Señal).

PANTALLAS:
1. Login de administrador.
2. Resumen: usuarios activos, rutinas generadas hoy, ingresos simulados del mes, uso de IA (solicitudes, tokens, costo estimado) y distribución de usuarios por IMC (dona).
3. Usuarios: tabla con búsqueda y filtros (rol, plan, condición), ficha lateral del usuario con su progreso, acciones de activar, bloquear y cambiar rol.
4. Entrenadores: lista, usuarios asignados y una cola de "rutinas por revisar" con un botón de aprobar o ajustar.
5. Ejercicios y contraindicaciones: catálogo CRUD y una MATRIZ ejercicio × condición (celdas marcadas en Señal donde hay contraindicación), editable.
6. Planes y anuncios: CRUD con métricas de impresiones y clics.
7. Reportes: ingresos por mes, adherencia, uso de IA; exportar a CSV/PDF.
8. MONITOREO (la pantalla estrella, para la materia de Redes):
   - Tarjetas por servicio (API, IA, Base de datos, Web) con estado, réplicas actuales/mínimas/máximas y latencia p95.
   - Gráfica en vivo de latencia con la banda de la línea base (media ± 3σ) sombreada y las anomalías marcadas como puntos en Señal.
   - Gráficas pequeñas de tasa de error, peticiones por segundo, CPU y memoria.
   - Línea de tiempo del ciclo MAPE-K: Monitor → Analizar → Planificar → Ejecutar, con la acción tomada (ej.: "Latencia API 3,8σ sobre la línea base → escalado de 2 a 3 réplicas → verificado ✓").
   - Bitácora de remediaciones (tabla) y un botón "Simular pico de tráfico" para la demostración en clase.
9. Configuración: proveedor de IA activo (Gemini / Mock), umbrales del detector (z-score, ventana) y políticas de remediación.
```

---

## Qué guardar después del diseño

| Exportar | Guardar en |
|---|---|
| Hoja de estilo y componentes | `docs/diseno/00_sistema.png` |
| Pantallas web | `docs/diseno/web/*.png` |
| Pantallas móvil | `docs/diseno/movil/*.png` |
| Pantallas escritorio | `docs/diseno/escritorio/*.png` |
| Si Claude Design entrega código o tokens (colores, fuentes) | `docs/diseno/tokens.json` o `docs/diseno/handoff/` |

Con eso, Claude Code puede construir con el diseño a la vista (ver `03_prompts_claude_code.md`).
