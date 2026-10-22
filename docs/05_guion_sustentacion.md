# FitIA — Guion de sustentación (10 minutos)

Reparto sugerido: **A** = introducción y cierre · **B** = Arquitectura · **C** = Bases de Datos · **D** = Redes. La demo la maneja quien tenga el PC; los demás hablan.

## Antes de entrar (15 minutos antes)

1. Docker Desktop abierto y `docker compose up -d` (o, sin Docker, las 5 terminales del README).
2. Verificar: abrir `http://localhost:8080`, entrar como Laura y cerrar sesión.
3. Correr `python backend/scripts/prueba_punta_a_punta.py`: deben salir **19 de 19 pasos OK**. Después, esperar 1 minuto (límite de 5 inicios de sesión por minuto).
4. Abrir y dejar listos: la web en la pantalla de ingreso, FitIA Control en **Monitoreo**, el celular con Expo Go y Workbench con la consulta de demo pegada.
5. Celular y PC en la misma red (mejor el hotspot propio), red de Windows en **Privada**.
6. Plan B: si algo falla en vivo, mostrar las capturas de `docs/capturas/` y las diapositivas.

## Guion

| Tiempo | Quién | Qué se dice | Qué se muestra |
|---|---|---|---|
| 0:00–1:00 | A | Problema: entrenar sin entrenador; rutinas genéricas que lesionan a quien tiene sobrepeso o dolor lumbar. Pregunta problema y objetivo general | Diapositivas: portada, problema, objetivos |
| 1:00–2:30 | B | **Arquitectura:** cliente-servidor en capas, una sola API para 3 clientes; modelo incremental en 7 etapas; patrones Strategy (Gemini/Mock), Chain of Responsibility (7 reglas del validador), Repository y Circuit Breaker | Diagrama de arquitectura (`docs/diagramas/06`) |
| 2:30–4:00 | — | **Demo web y celular:** Laura (sobrepeso + dolor lumbar) entra, ve su IMC 28,65, su rutina con el sello «Seguro para tu espalda» y su progreso. En el celular, la misma Laura y el modo entreno | Web en `localhost:8080` y el celular |
| 4:00–5:30 | C | **Base de datos:** 27 tablas en 3FN, IMC como columna generada, triggers, procedimientos, vistas, índices y roles de mínimo privilegio. **Defensa en profundidad**: aunque la IA y el validador fallen, la BD bloquea el ejercicio | Workbench: las 3 consultas de abajo |
| 5:30–7:30 | D | **Redes:** topología en Packet Tracer (2 VLAN, router-on-a-stick, DHCP, DNS `fitia.local`, ACL 110, WiFi WPA2). Innovación: monitoreo autónomo MAPE-K. **En vivo:** Simular pico de tráfico → anomalía → escalado → verificado | Diapositiva de red y FitIA Control → Monitoreo |
| 7:30–8:30 | B | **Despliegue:** `docker compose up` levanta MySQL, API, worker y Nginx como proxy inverso (única puerta de entrada, cabeceras de seguridad). Seguridad: JWT, rate-limit, consultas parametrizadas, pagos simulados (solo últimos 4 dígitos) | `docker-compose.yml` y `docker compose ps` |
| 8:30–9:30 | A | Resultados: 7 de 7 etapas, 69 pruebas automáticas + prueba de punta a punta de 19 pasos, costo $0 | Diapositiva de resultados |
| 9:30–10:00 | A | Cierre y preguntas | Diapositiva final |

## Consultas para Workbench (Bases de Datos)

Con Docker, conectar a `127.0.0.1:3307`, usuario `root`, clave `RootDocker2026*`.

```sql
USE fitia;

-- 1. Ejercicios que Laura (sobrepeso + dolor lumbar) SÍ puede hacer
CALL sp_ejercicios_seguros(3);

-- 2. Intentar meterle un ejercicio contraindicado → el trigger lo bloquea (Error 1644, SQLSTATE 45000)
INSERT INTO rutina_ejercicios (rutina_dia_id, ejercicio_id, orden, series, repeticiones) VALUES (1, 5, 9, 3, 8);

-- 3. Registrar un peso normal → el trigger le quita SOBREPESO; luego devolverla a 78 kg
INSERT INTO mediciones_corporales (usuario_id, peso_kg, estatura_cm) VALUES (3, 66, 165);
SELECT c.codigo, uc.activa FROM usuario_condiciones uc JOIN condiciones c ON c.id = uc.condicion_id WHERE uc.usuario_id = 3;
INSERT INTO mediciones_corporales (usuario_id, peso_kg, estatura_cm) VALUES (3, 78, 165);
```

## Preguntas probables

| Pregunta | Respuesta corta |
|---|---|
| ¿Por qué un modelo incremental y no cascada? | Cada etapa entregó algo funcionando (BD → API → web → móvil → monitoreo → despliegue) y pudimos corregir con lo que veíamos, sin esperar al final |
| ¿Por qué una sola API? | La lógica de negocio y las reglas de seguridad viven en un solo lugar; los 3 clientes solo muestran datos |
| ¿Qué pasa si la IA recomienda algo peligroso? | Tres filtros: catálogo permitido → validador de 7 reglas → trigger de MySQL. Si la IA falla, se usa el generador por reglas |
| ¿La IA conoce los datos personales? | No. A Gemini solo se le envía un perfil anónimo (edad, IMC, nivel, objetivo, condiciones, disponibilidad) |
| ¿Por qué Nginx? | Es la única puerta de entrada: sirve la web, reenvía la API y agrega cabeceras de seguridad. La API y la BD no quedan expuestas directamente |
| ¿El escalado es real? | Es simulado (se registra en la BD), pero la detección es real: línea base EWMA y z-score sobre métricas reales de la API |
| ¿Por qué el usuario de la API no es root? | Mínimo privilegio: `rol_api` solo lee, escribe y ejecuta procedimientos; no puede borrar tablas |
| ¿Cuánto costó? | $0: todo es software libre o capa gratuita sin tarjeta |
| ¿Usaron IA para hacer el proyecto? | Sí, como herramienta de apoyo, y está declarado. Las decisiones de diseño, las pruebas y la validación son del equipo, y podemos explicar cada parte |
