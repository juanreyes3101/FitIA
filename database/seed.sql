-- =====================================================================
--  FitIA — Datos semilla (catálogos + usuarios demo)
--  Ejecutar DESPUÉS de schema.sql:   mysql -u root -p fitia < seed.sql
--
--  Usuarios demo (contraseña en formato Werkzeug pbkdf2:sha256, verificable
--  con werkzeug.security.check_password_hash):
--     admin@fitia.co       / Admin2026*   (ADMIN)
--     coach@fitia.co       / Demo2026*    (ENTRENADOR)
--     laura@fitia.co       / Demo2026*    (USUARIO con sobrepeso + dolor lumbar)
--     andres@fitia.co      / Demo2026*    (USUARIO con bajo peso, premium)
-- =====================================================================
-- Las tildes y la ñ se guardan bien aunque el cliente use otro juego de caracteres
SET NAMES utf8mb4;
USE fitia;

-- ---------- Roles ----------
INSERT INTO roles (codigo, nombre, descripcion) VALUES
 ('USUARIO',    'Usuario',       'Persona que entrena y recibe rutinas'),
 ('ENTRENADOR', 'Entrenador',    'Revisa y ajusta rutinas, acompaña usuarios'),
 ('ADMIN',      'Administrador', 'Gestiona usuarios, planes, reportes y monitoreo');

-- ---------- Catálogos de entrenamiento ----------
INSERT INTO grupos_musculares (nombre) VALUES
 ('Piernas'), ('Glúteos'), ('Pecho'), ('Espalda'), ('Hombros'),
 ('Brazos'), ('Core'), ('Cuerpo completo'), ('Cadera y columna');

INSERT INTO equipamiento (nombre) VALUES
 ('Ninguno'), ('Mancuernas'), ('Barra'), ('Máquina'), ('Banda elástica'),
 ('Colchoneta'), ('Banco'), ('Kettlebell');

INSERT INTO condiciones (codigo, nombre, descripcion, origen) VALUES
 ('BAJO_PESO',    'Bajo peso',          'IMC menor a 18.5',                       'IMC'),
 ('SOBREPESO',    'Sobrepeso',          'IMC entre 25 y 29.9',                    'IMC'),
 ('OBESIDAD',     'Obesidad',           'IMC de 30 o más',                        'IMC'),
 ('DOLOR_LUMBAR', 'Molestia lumbar',    'Dolor o molestia en zona baja de la espalda', 'AUTORREPORTE'),
 ('DOLOR_RODILLA','Molestia de rodilla','Dolor al flexionar o impactar la rodilla','AUTORREPORTE'),
 ('HIPERTENSION', 'Hipertensión',       'Presión arterial alta diagnosticada',    'AUTORREPORTE');

-- tipo, grupo, equipo, dificultad, impacto, apto_lumbar
INSERT INTO ejercicios (nombre, tipo, grupo_muscular_id, equipamiento_id, dificultad, impacto, apto_lumbar, instrucciones) VALUES
 ('Sentadilla con peso corporal',          'FUERZA',      1, 1, 'PRINCIPIANTE', 'MEDIO', FALSE, 'Pies al ancho de hombros, baja como si te sentaras, rodillas en línea con los pies.'),
 ('Sentadilla con barra',                  'FUERZA',      1, 3, 'INTERMEDIO',   'ALTO',  FALSE, 'Barra sobre trapecios, espalda neutra, baja controlado hasta paralelo.'),
 ('Prensa de piernas',                     'FUERZA',      1, 4, 'PRINCIPIANTE', 'BAJO',  FALSE, 'Espalda apoyada completamente, no bloquees las rodillas al extender.'),
 ('Zancadas alternas',                     'FUERZA',      1, 1, 'INTERMEDIO',   'MEDIO', FALSE, 'Paso largo al frente, rodilla trasera cerca del piso, torso erguido.'),
 ('Peso muerto con barra',                 'FUERZA',      4, 3, 'AVANZADO',     'ALTO',  FALSE, 'Bisagra de cadera con la barra pegada a las piernas, espalda neutra.'),
 ('Puente de glúteo',                      'FUERZA',      2, 6, 'PRINCIPIANTE', 'BAJO',  TRUE,  'Acostado boca arriba, eleva la cadera apretando glúteos, sin arquear la espalda.'),
 ('Hip thrust con barra',                  'FUERZA',      2, 3, 'INTERMEDIO',   'MEDIO', FALSE, 'Espalda alta en banco, barra en cadera, extiende la cadera completa.'),
 ('Flexiones de pecho',                    'FUERZA',      3, 1, 'PRINCIPIANTE', 'BAJO',  FALSE, 'Cuerpo en línea recta; si es difícil, apoya rodillas.'),
 ('Press de banca con mancuernas',         'FUERZA',      3, 2, 'INTERMEDIO',   'BAJO',  FALSE, 'Acostado en banco, baja las mancuernas a la altura del pecho y empuja.'),
 ('Remo con mancuerna a una mano',         'FUERZA',      4, 2, 'PRINCIPIANTE', 'BAJO',  FALSE, 'Apoya mano y rodilla en banco, tira la mancuerna hacia la cadera.'),
 ('Jalón al pecho en polea',               'FUERZA',      4, 4, 'PRINCIPIANTE', 'BAJO',  FALSE, 'Agarre amplio, lleva la barra al pecho bajando los hombros.'),
 ('Remo con barra inclinado',              'FUERZA',      4, 3, 'INTERMEDIO',   'MEDIO', FALSE, 'Torso inclinado a 45°, tira la barra al abdomen.'),
 ('Press militar con mancuernas sentado',  'FUERZA',      5, 2, 'PRINCIPIANTE', 'BAJO',  FALSE, 'Sentado con respaldo, empuja las mancuernas sobre la cabeza.'),
 ('Elevaciones laterales',                 'FUERZA',      5, 2, 'PRINCIPIANTE', 'BAJO',  FALSE, 'Eleva los brazos a los lados hasta la altura de los hombros.'),
 ('Curl de bíceps con mancuernas',         'FUERZA',      6, 2, 'PRINCIPIANTE', 'BAJO',  FALSE, 'Codos pegados al cuerpo, sube sin balancear el torso.'),
 ('Extensión de tríceps en polea',         'FUERZA',      6, 4, 'PRINCIPIANTE', 'BAJO',  FALSE, 'Codos fijos, extiende completamente hacia abajo.'),
 ('Plancha frontal',                       'CORE',        7, 6, 'PRINCIPIANTE', 'BAJO',  TRUE,  'Antebrazos en el piso, cuerpo recto, abdomen y glúteos activos.'),
 ('Dead bug',                              'CORE',        7, 6, 'PRINCIPIANTE', 'BAJO',  TRUE,  'Boca arriba, baja brazo y pierna contrarios sin despegar la zona lumbar.'),
 ('Bird dog',                              'CORE',        7, 6, 'PRINCIPIANTE', 'BAJO',  TRUE,  'En cuatro apoyos, extiende brazo y pierna contrarios manteniendo la espalda plana.'),
 ('Abdominales crunch',                    'CORE',        7, 6, 'PRINCIPIANTE', 'BAJO',  FALSE, 'Eleva los hombros del piso contrayendo el abdomen.'),
 ('Elevación de piernas acostado',         'CORE',        7, 6, 'INTERMEDIO',   'BAJO',  FALSE, 'Boca arriba, sube y baja las piernas extendidas.'),
 ('Caminata en cinta inclinada',           'CARDIO',      8, 4, 'PRINCIPIANTE', 'BAJO',  TRUE,  'Inclinación 6-10 %, paso firme sin apoyarte en los pasamanos.'),
 ('Bicicleta estática',                    'CARDIO',      8, 4, 'PRINCIPIANTE', 'BAJO',  TRUE,  'Sillín a la altura de la cadera, ritmo constante.'),
 ('Burpees',                               'CARDIO',      8, 1, 'INTERMEDIO',   'ALTO',  FALSE, 'Sentadilla, plancha, flexión y salto en un solo movimiento.'),
 ('Saltos de tijera',                      'CARDIO',      8, 1, 'PRINCIPIANTE', 'ALTO',  FALSE, 'Salta abriendo piernas y brazos a la vez.'),
 ('Salto a la cuerda',                     'CARDIO',      8, 1, 'INTERMEDIO',   'ALTO',  FALSE, 'Saltos cortos sobre la punta de los pies.'),
 ('Kettlebell swing',                      'FUERZA',      2, 8, 'INTERMEDIO',   'MEDIO', FALSE, 'Bisagra de cadera explosiva, la pesa sube a la altura del pecho.'),
 ('Gato-camello',                          'MOVILIDAD',   9, 6, 'PRINCIPIANTE', 'BAJO',  TRUE,  'En cuatro apoyos, alterna redondear y arquear suavemente la espalda.'),
 ('Postura del niño',                      'ESTIRAMIENTO',9, 6, 'PRINCIPIANTE', 'BAJO',  TRUE,  'Siéntate sobre los talones y lleva los brazos al frente, respira profundo.'),
 ('Rodillas al pecho',                     'ESTIRAMIENTO',9, 6, 'PRINCIPIANTE', 'BAJO',  TRUE,  'Boca arriba, abraza ambas rodillas hacia el pecho 30 segundos.'),
 ('Estiramiento de piriforme',             'ESTIRAMIENTO',2, 6, 'PRINCIPIANTE', 'BAJO',  TRUE,  'Boca arriba, cruza un tobillo sobre la rodilla contraria y acerca la pierna.'),
 ('Estiramiento de isquiotibiales con banda','ESTIRAMIENTO',1, 5, 'PRINCIPIANTE', 'BAJO', TRUE,  'Boca arriba, eleva la pierna recta ayudándote con la banda.'),
 ('Rotación lumbar acostado',              'MOVILIDAD',   9, 6, 'PRINCIPIANTE', 'BAJO',  TRUE,  'Rodillas dobladas, déjalas caer a un lado y al otro lentamente.'),
 ('Estiramiento de flexores de cadera',    'ESTIRAMIENTO',9, 6, 'PRINCIPIANTE', 'BAJO',  TRUE,  'Rodilla al piso en posición de zancada, empuja la cadera al frente.'),
 ('Remo en máquina sentado',               'FUERZA',      4, 4, 'PRINCIPIANTE', 'BAJO',  FALSE, 'Pecho apoyado, tira de los agarres juntando escápulas.');

-- ---------- Contraindicaciones (reglas de seguridad) ----------
-- condicion_id: 1 BAJO_PESO, 2 SOBREPESO, 3 OBESIDAD, 4 DOLOR_LUMBAR, 5 DOLOR_RODILLA, 6 HIPERTENSION
INSERT INTO contraindicaciones (ejercicio_id, condicion_id, motivo) VALUES
 (2,  4, 'Carga axial sobre la columna'),
 (5,  4, 'Alta exigencia de la zona lumbar con carga'),
 (12, 4, 'Flexión de tronco sostenida con carga'),
 (20, 4, 'Flexión lumbar repetida'),
 (21, 4, 'Tiende a hiperextender la zona lumbar'),
 (24, 4, 'Movimiento explosivo con flexión de tronco'),
 (27, 4, 'Bisagra balística que exige la zona lumbar'),
 (24, 2, 'Alto impacto articular'),
 (24, 3, 'Alto impacto articular y exigencia cardiovascular'),
 (25, 3, 'Alto impacto articular'),
 (26, 3, 'Alto impacto articular'),
 (5,  3, 'Técnica exigente; preferir variantes guiadas al inicio'),
 (2,  5, 'Flexión profunda de rodilla con carga'),
 (4,  5, 'Estrés de rodilla en apoyo unilateral'),
 (24, 5, 'Impacto sobre la rodilla'),
 (25, 5, 'Impacto sobre la rodilla'),
 (26, 5, 'Impacto repetido sobre la rodilla'),
 (5,  6, 'Maniobra de Valsalva eleva la presión arterial'),
 (2,  6, 'Maniobra de Valsalva eleva la presión arterial'),
 (24, 1, 'Gasto calórico alto, contrario al objetivo de ganar peso'),
 (26, 1, 'Gasto calórico alto, contrario al objetivo de ganar peso');

-- ---------- Planes ----------
INSERT INTO planes (codigo, nombre, precio_cop, duracion_dias, con_publicidad, rutinas_ia_mes) VALUES
 ('GRATIS',        'FitIA Free',          0,      NULL, TRUE,  2),
 ('PREMIUM_MES',   'FitIA Pro mensual',   19900,  30,   FALSE, 10),
 ('PREMIUM_ANUAL', 'FitIA Pro anual',     199000, 365,  FALSE, 10);

-- ---------- Usuarios demo ----------
INSERT INTO usuarios (rol_id, nombres, apellidos, email, password_hash, telefono, fecha_nacimiento, sexo, acepta_terminos) VALUES
 (3, 'Admin',  'FitIA',  'admin@fitia.co',  'pbkdf2:sha256:600000$FitIAdemoSalt2026$253251a41c430db8c6201d5cbe82b7144c01891af8aef17201e8cd980ca46d7e', '3000000000', '1995-01-01', 'N', TRUE),
 (2, 'Camilo', 'Torres', 'coach@fitia.co',  'pbkdf2:sha256:600000$FitIAdemoSalt2026$0ad0293b48350e37abf50e2a964fcc2c866598c2e6530f365228a0cf387594dd', '3001112233', '1992-05-14', 'M', TRUE),
 (1, 'Laura',  'Gómez',  'laura@fitia.co',  'pbkdf2:sha256:600000$FitIAdemoSalt2026$0ad0293b48350e37abf50e2a964fcc2c866598c2e6530f365228a0cf387594dd', '3014445566', '1998-09-22', 'F', TRUE),
 (1, 'Andrés', 'Rojas',  'andres@fitia.co', 'pbkdf2:sha256:600000$FitIAdemoSalt2026$0ad0293b48350e37abf50e2a964fcc2c866598c2e6530f365228a0cf387594dd', '3027778899', '2003-02-10', 'M', TRUE);

INSERT INTO entrenadores (usuario_id, especialidad, certificacion, biografia) VALUES
 (2, 'Readaptación y salud de espalda', 'Licenciado en Educación Física', 'Entrenador de gimnasio barrial con 6 años de experiencia.');

INSERT INTO perfiles_salud (usuario_id, nivel_actividad, objetivo, dias_disponibles, minutos_por_sesion, lugar_entreno) VALUES
 (3, 'SEDENTARIO', 'BAJAR_PESO', 3, 45, 'GIMNASIO'),
 (4, 'LIGERO',     'GANAR_MASA', 4, 60, 'GIMNASIO');

-- Molestia lumbar autorreportada por Laura
INSERT INTO usuario_condiciones (usuario_id, condicion_id, severidad) VALUES (3, 4, 2);

-- Mediciones: el trigger asigna SOBREPESO a Laura y BAJO_PESO a Andrés automáticamente
INSERT INTO mediciones_corporales (usuario_id, peso_kg, estatura_cm, cintura_cm, registrado_en) VALUES
 (3, 81.0, 165, 94, DATE_SUB(NOW(), INTERVAL 60 DAY)),
 (3, 79.5, 165, 92, DATE_SUB(NOW(), INTERVAL 30 DAY)),
 (3, 78.0, 165, 90, NOW()),
 (4, 55.0, 178, 70, DATE_SUB(NOW(), INTERVAL 20 DAY)),
 (4, 56.2, 178, 71, NOW());

-- Suscripciones: Laura en plan gratis; Andrés paga Pro mensual (pago simulado)
INSERT INTO suscripciones (usuario_id, plan_id, fecha_inicio, fecha_fin, estado)
VALUES (3, 1, CURRENT_DATE, NULL, 'ACTIVA');
CALL sp_simular_pago(4, 'PREMIUM_MES', 'TARJETA', '4242', @pago, @estado);

-- Rutina de ejemplo para Laura (solo ejercicios seguros; el trigger lo garantiza)
INSERT INTO rutinas (usuario_id, nombre, objetivo, origen, estado, semanas, entrenador_revisor_id)
VALUES (3, 'Arranque seguro — espalda fuerte', 'BAJAR_PESO', 'IA', 'ACTIVA', 4, 2);
SET @r := LAST_INSERT_ID();
INSERT INTO rutina_dias (rutina_id, dia_numero, enfoque) VALUES
 (@r, 1, 'Cardio suave + core'), (@r, 2, 'Fuerza tren inferior'), (@r, 3, 'Movilidad lumbar');
SET @d1 := (SELECT id FROM rutina_dias WHERE rutina_id=@r AND dia_numero=1);
SET @d2 := (SELECT id FROM rutina_dias WHERE rutina_id=@r AND dia_numero=2);
SET @d3 := (SELECT id FROM rutina_dias WHERE rutina_id=@r AND dia_numero=3);
INSERT INTO rutina_ejercicios (rutina_dia_id, ejercicio_id, orden, series, repeticiones, duracion_seg, descanso_seg) VALUES
 (@d1, 22, 1, 1, NULL, 1200, 60),
 (@d1, 18, 2, 3, 10,  NULL, 45),
 (@d1, 19, 3, 3, 10,  NULL, 45),
 (@d1, 17, 4, 3, NULL, 30,  45),
 (@d2, 3,  1, 3, 12,  NULL, 90),
 (@d2, 6,  2, 3, 15,  NULL, 60),
 (@d2, 11, 3, 3, 12,  NULL, 60),
 (@d2, 35, 4, 3, 12,  NULL, 60),
 (@d3, 28, 1, 2, 10,  NULL, 30),
 (@d3, 30, 2, 2, NULL, 30,  20),
 (@d3, 33, 3, 2, 10,  NULL, 20),
 (@d3, 31, 4, 2, NULL, 30,  20),
 (@d3, 29, 5, 1, NULL, 60,  0);

INSERT INTO sesiones_entrenamiento (usuario_id, rutina_dia_id, fecha, duracion_min, esfuerzo_percibido, dolor_reportado) VALUES
 (3, @d1, DATE_SUB(NOW(), INTERVAL 6 DAY), 40, 6, 2),
 (3, @d2, DATE_SUB(NOW(), INTERVAL 4 DAY), 45, 7, 3),
 (3, @d3, DATE_SUB(NOW(), INTERVAL 2 DAY), 25, 3, 1);

INSERT INTO solicitudes_ia (usuario_id, rutina_id, proveedor, modelo, tokens_entrada, tokens_salida, latencia_ms, estado)
VALUES (3, @r, 'gemini', 'gemini-flash', 2150, 1380, 4820, 'OK');

-- ---------- Publicidad (anunciantes ficticios) ----------
INSERT INTO anuncios (anunciante, titulo, ubicacion) VALUES
 ('Tienda Deportiva Ejemplo', '20 % en tenis de entrenamiento', 'BANNER_HOME'),
 ('Bebida Hidratante Ejemplo', 'Hidrátate entre series',       'ENTRE_EJERCICIOS');

-- ---------- Monitoreo ----------
INSERT INTO servicios (codigo, nombre, replicas_actuales, replicas_min, replicas_max) VALUES
 ('api', 'API REST Flask',          2, 1, 6),
 ('ia',  'Servicio de IA (rutinas)', 1, 1, 3),
 ('db',  'MySQL',                    1, 1, 1),
 ('web', 'Frontend web',             1, 1, 4);
