-- =====================================================================
--  FitIA — Esquema de base de datos
--  Motor: MySQL 8.0+ (compatible con MariaDB 10.6+)
--  Proyecto Integrador CUN — Bases de Datos / Arquitectura / Redes
--
--  Cómo correrlo (MySQL Workbench o consola):
--     mysql -u root -p < schema.sql
--     mysql -u root -p fitia < seed.sql
--
--  Organización del esquema (4 dominios):
--     A. Usuarios y seguridad ......... roles, usuarios, entrenadores, auditoria
--     B. Perfil de salud .............. perfiles_salud, mediciones_corporales,
--                                       condiciones, usuario_condiciones
--     C. Entrenamiento e IA ........... grupos_musculares, equipamiento, ejercicios,
--                                       contraindicaciones, rutinas, rutina_dias,
--                                       rutina_ejercicios, solicitudes_ia,
--                                       sesiones_entrenamiento, sesion_ejercicios
--     D. Negocio ...................... planes, suscripciones, pagos, anuncios
--     E. Monitoreo autónomo (Redes) ... servicios, metricas, lineas_base,
--                                       anomalias, acciones_remediacion
-- =====================================================================

DROP DATABASE IF EXISTS fitia;
CREATE DATABASE fitia CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE fitia;

-- =====================================================================
-- A. USUARIOS Y SEGURIDAD
-- =====================================================================

CREATE TABLE roles (
    id          TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    codigo      VARCHAR(20)  NOT NULL UNIQUE,          -- USUARIO, ENTRENADOR, ADMIN
    nombre      VARCHAR(50)  NOT NULL,
    descripcion VARCHAR(255)
) ENGINE=InnoDB;

CREATE TABLE usuarios (
    id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    rol_id           TINYINT UNSIGNED NOT NULL,
    nombres          VARCHAR(80)  NOT NULL,
    apellidos        VARCHAR(80)  NOT NULL,
    email            VARCHAR(120) NOT NULL UNIQUE,
    password_hash    VARCHAR(255) NOT NULL,             -- bcrypt / pbkdf2, nunca texto plano
    telefono         VARCHAR(20),
    fecha_nacimiento DATE,
    sexo             ENUM('F','M','O','N') DEFAULT 'N', -- N = prefiere no decir
    estado           ENUM('ACTIVO','INACTIVO','BLOQUEADO') NOT NULL DEFAULT 'ACTIVO',
    acepta_terminos  BOOLEAN NOT NULL DEFAULT FALSE,    -- Ley 1581 de 2012 (habeas data)
    ultimo_acceso    DATETIME,
    creado_en        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_usuarios_rol FOREIGN KEY (rol_id) REFERENCES roles(id),
    INDEX idx_usuarios_rol (rol_id)
) ENGINE=InnoDB;

-- Especialización 1:1 de usuarios con rol ENTRENADOR
CREATE TABLE entrenadores (
    usuario_id     INT UNSIGNED PRIMARY KEY,
    especialidad   VARCHAR(100),
    certificacion  VARCHAR(150),
    biografia      TEXT,
    activo         BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_entrenadores_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Bitácora llenada por triggers (trazabilidad de datos sensibles)
CREATE TABLE auditoria (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tabla       VARCHAR(64)  NOT NULL,
    registro_id BIGINT UNSIGNED NOT NULL,
    accion      ENUM('INSERT','UPDATE','DELETE') NOT NULL,
    usuario_id  INT UNSIGNED,
    datos       JSON,
    creado_en   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_auditoria_tabla (tabla, registro_id)
) ENGINE=InnoDB;

-- =====================================================================
-- B. PERFIL DE SALUD
-- =====================================================================

-- Datos de entrenamiento que cambian poco (1:1 con usuario)
CREATE TABLE perfiles_salud (
    usuario_id         INT UNSIGNED PRIMARY KEY,
    nivel_actividad    ENUM('SEDENTARIO','LIGERO','MODERADO','ACTIVO','MUY_ACTIVO') NOT NULL,
    objetivo           ENUM('BAJAR_PESO','GANAR_MASA','TONIFICAR','SALUD_GENERAL','ALIVIAR_LUMBAR') NOT NULL,
    dias_disponibles   TINYINT UNSIGNED NOT NULL DEFAULT 3,
    minutos_por_sesion SMALLINT UNSIGNED NOT NULL DEFAULT 45,
    lugar_entreno      ENUM('GIMNASIO','CASA','PARQUE') NOT NULL DEFAULT 'GIMNASIO',
    observaciones      VARCHAR(500),
    actualizado_en     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_perfil_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    CONSTRAINT chk_perfil_dias    CHECK (dias_disponibles BETWEEN 1 AND 7),
    CONSTRAINT chk_perfil_minutos CHECK (minutos_por_sesion BETWEEN 10 AND 180)
) ENGINE=InnoDB;

-- Histórico de peso/estatura: el IMC se CALCULA (columna generada), no se digita
CREATE TABLE mediciones_corporales (
    id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    usuario_id     INT UNSIGNED NOT NULL,
    peso_kg        DECIMAL(5,2) NOT NULL,
    estatura_cm    DECIMAL(5,2) NOT NULL,
    imc            DECIMAL(5,2) AS (ROUND(peso_kg / ((estatura_cm/100) * (estatura_cm/100)), 2)) STORED,
    cintura_cm     DECIMAL(5,2),
    registrado_en  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_medicion_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    CONSTRAINT chk_medicion_peso     CHECK (peso_kg BETWEEN 20 AND 350),
    CONSTRAINT chk_medicion_estatura CHECK (estatura_cm BETWEEN 100 AND 250),
    INDEX idx_mediciones_usuario_fecha (usuario_id, registrado_en)
) ENGINE=InnoDB;

-- Catálogo: BAJO_PESO, SOBREPESO, OBESIDAD, DOLOR_LUMBAR, DOLOR_RODILLA, HIPERTENSION...
CREATE TABLE condiciones (
    id           SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    codigo       VARCHAR(30)  NOT NULL UNIQUE,
    nombre       VARCHAR(80)  NOT NULL,
    descripcion  VARCHAR(255),
    origen       ENUM('IMC','AUTORREPORTE') NOT NULL   -- IMC = la asigna el sistema
) ENGINE=InnoDB;

-- Relación N:M usuario <-> condición
CREATE TABLE usuario_condiciones (
    usuario_id    INT UNSIGNED NOT NULL,
    condicion_id  SMALLINT UNSIGNED NOT NULL,
    severidad     TINYINT UNSIGNED NOT NULL DEFAULT 1,  -- 1 leve, 2 moderada, 3 alta
    activa        BOOLEAN NOT NULL DEFAULT TRUE,
    desde         DATE NOT NULL DEFAULT (CURRENT_DATE),
    PRIMARY KEY (usuario_id, condicion_id),
    CONSTRAINT fk_uc_usuario   FOREIGN KEY (usuario_id)   REFERENCES usuarios(id) ON DELETE CASCADE,
    CONSTRAINT fk_uc_condicion FOREIGN KEY (condicion_id) REFERENCES condiciones(id),
    CONSTRAINT chk_uc_severidad CHECK (severidad BETWEEN 1 AND 3)
) ENGINE=InnoDB;

-- =====================================================================
-- C. ENTRENAMIENTO E IA
-- =====================================================================

CREATE TABLE grupos_musculares (
    id      TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre  VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE equipamiento (
    id      TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre  VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE ejercicios (
    id                 INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre             VARCHAR(100) NOT NULL UNIQUE,
    tipo               ENUM('FUERZA','CARDIO','ESTIRAMIENTO','MOVILIDAD','CORE') NOT NULL,
    grupo_muscular_id  TINYINT UNSIGNED NOT NULL,
    equipamiento_id    TINYINT UNSIGNED NOT NULL,
    dificultad         ENUM('PRINCIPIANTE','INTERMEDIO','AVANZADO') NOT NULL,
    impacto            ENUM('BAJO','MEDIO','ALTO') NOT NULL,
    apto_lumbar        BOOLEAN NOT NULL DEFAULT FALSE,     -- recomendado para molestia lumbar
    instrucciones      TEXT,
    imagen_url         VARCHAR(255),
    video_url          VARCHAR(255),
    CONSTRAINT fk_ej_grupo  FOREIGN KEY (grupo_muscular_id) REFERENCES grupos_musculares(id),
    CONSTRAINT fk_ej_equipo FOREIGN KEY (equipamiento_id)   REFERENCES equipamiento(id),
    INDEX idx_ej_tipo (tipo, dificultad)
) ENGINE=InnoDB;

-- Reglas de seguridad: qué ejercicio NO debe hacer quien tenga qué condición.
-- La IA propone, pero esta tabla decide (validador + trigger).
CREATE TABLE contraindicaciones (
    ejercicio_id   INT UNSIGNED NOT NULL,
    condicion_id   SMALLINT UNSIGNED NOT NULL,
    motivo         VARCHAR(255) NOT NULL,
    PRIMARY KEY (ejercicio_id, condicion_id),
    CONSTRAINT fk_ci_ejercicio FOREIGN KEY (ejercicio_id) REFERENCES ejercicios(id) ON DELETE CASCADE,
    CONSTRAINT fk_ci_condicion FOREIGN KEY (condicion_id) REFERENCES condiciones(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE rutinas (
    id                       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    usuario_id               INT UNSIGNED NOT NULL,
    nombre                   VARCHAR(100) NOT NULL,
    objetivo                 VARCHAR(30)  NOT NULL,
    origen                   ENUM('IA','ENTRENADOR','PLANTILLA') NOT NULL DEFAULT 'IA',
    estado                   ENUM('BORRADOR','VALIDADA','RECHAZADA','ACTIVA','ARCHIVADA') NOT NULL DEFAULT 'BORRADOR',
    semanas                  TINYINT UNSIGNED NOT NULL DEFAULT 4,
    observaciones_validacion VARCHAR(500),
    entrenador_revisor_id    INT UNSIGNED,               -- opcional: un entrenador aprueba
    creada_en                DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_rutina_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    CONSTRAINT fk_rutina_revisor FOREIGN KEY (entrenador_revisor_id) REFERENCES entrenadores(usuario_id) ON DELETE SET NULL,
    INDEX idx_rutinas_usuario_estado (usuario_id, estado)
) ENGINE=InnoDB;

CREATE TABLE rutina_dias (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    rutina_id   INT UNSIGNED NOT NULL,
    dia_numero  TINYINT UNSIGNED NOT NULL,                -- 1..7
    enfoque     VARCHAR(60)  NOT NULL,                    -- "Tren inferior", "Movilidad lumbar"...
    CONSTRAINT fk_rd_rutina FOREIGN KEY (rutina_id) REFERENCES rutinas(id) ON DELETE CASCADE,
    CONSTRAINT uq_rd UNIQUE (rutina_id, dia_numero),
    CONSTRAINT chk_rd_dia CHECK (dia_numero BETWEEN 1 AND 7)
) ENGINE=InnoDB;

CREATE TABLE rutina_ejercicios (
    id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    rutina_dia_id  INT UNSIGNED NOT NULL,
    ejercicio_id   INT UNSIGNED NOT NULL,
    orden          TINYINT UNSIGNED NOT NULL,
    series         TINYINT UNSIGNED,
    repeticiones   TINYINT UNSIGNED,
    duracion_seg   SMALLINT UNSIGNED,                     -- para cardio / estiramientos
    descanso_seg   SMALLINT UNSIGNED NOT NULL DEFAULT 60,
    notas          VARCHAR(255),
    CONSTRAINT fk_re_dia       FOREIGN KEY (rutina_dia_id) REFERENCES rutina_dias(id) ON DELETE CASCADE,
    CONSTRAINT fk_re_ejercicio FOREIGN KEY (ejercicio_id)  REFERENCES ejercicios(id),
    CONSTRAINT uq_re_orden UNIQUE (rutina_dia_id, orden),
    CONSTRAINT chk_re_volumen CHECK (repeticiones IS NOT NULL OR duracion_seg IS NOT NULL)
) ENGINE=InnoDB;

-- Cada llamada al modelo de IA queda registrada (costo, latencia, errores).
-- Alimenta también el módulo de monitoreo.
CREATE TABLE solicitudes_ia (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    usuario_id      INT UNSIGNED NOT NULL,
    rutina_id       INT UNSIGNED,
    proveedor       VARCHAR(30)  NOT NULL,                -- gemini, mock
    modelo          VARCHAR(60)  NOT NULL,
    tokens_entrada  INT UNSIGNED,
    tokens_salida   INT UNSIGNED,
    latencia_ms     INT UNSIGNED,
    estado          ENUM('OK','ERROR','RECHAZADA_VALIDACION') NOT NULL,
    detalle_error   VARCHAR(500),
    creado_en       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sia_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    CONSTRAINT fk_sia_rutina  FOREIGN KEY (rutina_id)  REFERENCES rutinas(id)  ON DELETE SET NULL,
    INDEX idx_sia_fecha (creado_en)
) ENGINE=InnoDB;

CREATE TABLE sesiones_entrenamiento (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    usuario_id          INT UNSIGNED NOT NULL,
    rutina_dia_id       INT UNSIGNED,
    fecha               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    duracion_min        SMALLINT UNSIGNED,
    esfuerzo_percibido  TINYINT UNSIGNED,                 -- escala RPE 1..10
    dolor_reportado     TINYINT UNSIGNED NOT NULL DEFAULT 0, -- 0..10 (alerta si > 5)
    completada          BOOLEAN NOT NULL DEFAULT TRUE,
    notas               VARCHAR(255),
    CONSTRAINT fk_se_usuario FOREIGN KEY (usuario_id)    REFERENCES usuarios(id) ON DELETE CASCADE,
    CONSTRAINT fk_se_dia     FOREIGN KEY (rutina_dia_id) REFERENCES rutina_dias(id) ON DELETE SET NULL,
    CONSTRAINT chk_se_rpe    CHECK (esfuerzo_percibido BETWEEN 1 AND 10),
    CONSTRAINT chk_se_dolor  CHECK (dolor_reportado BETWEEN 0 AND 10),
    INDEX idx_se_usuario_fecha (usuario_id, fecha)
) ENGINE=InnoDB;

CREATE TABLE sesion_ejercicios (
    sesion_id       INT UNSIGNED NOT NULL,
    ejercicio_id    INT UNSIGNED NOT NULL,
    series_hechas   TINYINT UNSIGNED NOT NULL,
    reps_hechas     TINYINT UNSIGNED,
    peso_kg         DECIMAL(5,2),
    PRIMARY KEY (sesion_id, ejercicio_id),
    CONSTRAINT fk_sej_sesion    FOREIGN KEY (sesion_id)    REFERENCES sesiones_entrenamiento(id) ON DELETE CASCADE,
    CONSTRAINT fk_sej_ejercicio FOREIGN KEY (ejercicio_id) REFERENCES ejercicios(id)
) ENGINE=InnoDB;

-- =====================================================================
-- D. NEGOCIO (modelo gratis con publicidad + premium con pago SIMULADO)
-- =====================================================================

CREATE TABLE planes (
    id                  TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    codigo              VARCHAR(20)  NOT NULL UNIQUE,     -- GRATIS, PREMIUM_MES, PREMIUM_ANUAL
    nombre              VARCHAR(50)  NOT NULL,
    precio_cop          DECIMAL(10,2) NOT NULL DEFAULT 0,
    duracion_dias       SMALLINT UNSIGNED,                -- NULL = indefinido
    con_publicidad      BOOLEAN NOT NULL DEFAULT TRUE,
    rutinas_ia_mes      TINYINT UNSIGNED NOT NULL,        -- cupo de generaciones por mes
    activo              BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB;

CREATE TABLE suscripciones (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    usuario_id    INT UNSIGNED NOT NULL,
    plan_id       TINYINT UNSIGNED NOT NULL,
    fecha_inicio  DATE NOT NULL,
    fecha_fin     DATE,
    estado        ENUM('ACTIVA','VENCIDA','CANCELADA') NOT NULL DEFAULT 'ACTIVA',
    CONSTRAINT fk_sus_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    CONSTRAINT fk_sus_plan    FOREIGN KEY (plan_id)    REFERENCES planes(id),
    INDEX idx_sus_usuario_estado (usuario_id, estado)
) ENGINE=InnoDB;

-- NUNCA se guarda el número completo de tarjeta ni el CVV: solo últimos 4.
CREATE TABLE pagos (
    id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    usuario_id       INT UNSIGNED NOT NULL,
    suscripcion_id   INT UNSIGNED,
    monto_cop        DECIMAL(10,2) NOT NULL,
    metodo           ENUM('TARJETA','PSE','NEQUI') NOT NULL,
    ultimos4         CHAR(4),
    referencia       VARCHAR(40) NOT NULL UNIQUE,
    estado           ENUM('PENDIENTE','APROBADO','RECHAZADO') NOT NULL,
    motivo_rechazo   VARCHAR(120),
    simulado         BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pago_usuario     FOREIGN KEY (usuario_id)     REFERENCES usuarios(id) ON DELETE CASCADE,
    CONSTRAINT fk_pago_suscripcion FOREIGN KEY (suscripcion_id) REFERENCES suscripciones(id) ON DELETE SET NULL,
    CONSTRAINT chk_pago_monto CHECK (monto_cop >= 0),
    INDEX idx_pagos_fecha (creado_en)
) ENGINE=InnoDB;

CREATE TABLE anuncios (
    id          SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    anunciante  VARCHAR(80)  NOT NULL,
    titulo      VARCHAR(100) NOT NULL,
    imagen_url  VARCHAR(255),
    destino_url VARCHAR(255),
    ubicacion   ENUM('BANNER_HOME','ENTRE_EJERCICIOS','FIN_SESION') NOT NULL,
    impresiones INT UNSIGNED NOT NULL DEFAULT 0,
    clics       INT UNSIGNED NOT NULL DEFAULT 0,
    activo      BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB;

-- =====================================================================
-- E. MONITOREO INTELIGENTE (Innovación Tecnológica de Redes)
--    Ciclo MAPE-K: Monitor -> Analyze -> Plan -> Execute sobre Knowledge
-- =====================================================================

CREATE TABLE servicios (
    id                 TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    codigo             VARCHAR(30) NOT NULL UNIQUE,       -- api, ia, db
    nombre             VARCHAR(60) NOT NULL,
    replicas_actuales  TINYINT UNSIGNED NOT NULL DEFAULT 1,  -- escalado SIMULADO
    replicas_min       TINYINT UNSIGNED NOT NULL DEFAULT 1,
    replicas_max       TINYINT UNSIGNED NOT NULL DEFAULT 5,
    estado             ENUM('SALUDABLE','DEGRADADO','CAIDO') NOT NULL DEFAULT 'SALUDABLE'
) ENGINE=InnoDB;

-- (M) Monitor: series de tiempo capturadas por el middleware del backend
CREATE TABLE metricas (
    id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    servicio_id    TINYINT UNSIGNED NOT NULL,
    metrica        ENUM('LATENCIA_MS','TASA_ERROR','RPS','CPU_PCT','MEM_PCT') NOT NULL,
    valor          DECIMAL(12,4) NOT NULL,
    registrado_en  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_met_servicio FOREIGN KEY (servicio_id) REFERENCES servicios(id),
    INDEX idx_met_serie (servicio_id, metrica, registrado_en)
) ENGINE=InnoDB;

-- (K) Knowledge: línea base dinámica (media y desviación móviles, calculadas con Pandas)
CREATE TABLE lineas_base (
    id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    servicio_id    TINYINT UNSIGNED NOT NULL,
    metrica        ENUM('LATENCIA_MS','TASA_ERROR','RPS','CPU_PCT','MEM_PCT') NOT NULL,
    media          DECIMAL(12,4) NOT NULL,
    desviacion     DECIMAL(12,4) NOT NULL,
    p95            DECIMAL(12,4),
    ventana_min    SMALLINT UNSIGNED NOT NULL,            -- tamaño de la ventana móvil
    muestras       INT UNSIGNED NOT NULL,
    calculada_en   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_lb_servicio FOREIGN KEY (servicio_id) REFERENCES servicios(id),
    INDEX idx_lb_ultima (servicio_id, metrica, calculada_en)
) ENGINE=InnoDB;

-- (A) Analyze: desviaciones detectadas (z-score sobre la línea base)
CREATE TABLE anomalias (
    id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    servicio_id       TINYINT UNSIGNED NOT NULL,
    linea_base_id     INT UNSIGNED,
    metrica           ENUM('LATENCIA_MS','TASA_ERROR','RPS','CPU_PCT','MEM_PCT') NOT NULL,
    valor_observado   DECIMAL(12,4) NOT NULL,
    valor_esperado    DECIMAL(12,4) NOT NULL,
    zscore            DECIMAL(8,3)  NOT NULL,
    severidad         ENUM('BAJA','MEDIA','ALTA','CRITICA') NOT NULL,
    estado            ENUM('ABIERTA','MITIGADA','DESCARTADA') NOT NULL DEFAULT 'ABIERTA',
    detectada_en      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resuelta_en       DATETIME,
    CONSTRAINT fk_an_servicio FOREIGN KEY (servicio_id)   REFERENCES servicios(id),
    CONSTRAINT fk_an_lb       FOREIGN KEY (linea_base_id) REFERENCES lineas_base(id) ON DELETE SET NULL,
    INDEX idx_an_estado (estado, detectada_en)
) ENGINE=InnoDB;

-- (P/E) Plan + Execute: acción de auto-remediación tomada (simulada)
CREATE TABLE acciones_remediacion (
    id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    anomalia_id       BIGINT UNSIGNED NOT NULL,
    tipo              ENUM('ESCALAR_ARRIBA','ESCALAR_ABAJO','REINICIAR_WORKER','LIMPIAR_CACHE',
                           'CIRCUIT_BREAKER','CAMBIAR_PROVEEDOR_IA','NOTIFICAR_ADMIN') NOT NULL,
    detalle           VARCHAR(255),
    replicas_antes    TINYINT UNSIGNED,
    replicas_despues  TINYINT UNSIGNED,
    resultado         ENUM('EXITOSA','FALLIDA','PENDIENTE') NOT NULL DEFAULT 'PENDIENTE',
    ejecutada_en      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ar_anomalia FOREIGN KEY (anomalia_id) REFERENCES anomalias(id) ON DELETE CASCADE
) ENGINE=InnoDB;


-- =====================================================================
-- FUNCIONES
-- =====================================================================
DELIMITER //

-- Clasificación OMS del IMC
CREATE FUNCTION fn_clasificar_imc(p_imc DECIMAL(5,2))
RETURNS VARCHAR(20) DETERMINISTIC
BEGIN
    RETURN CASE
        WHEN p_imc IS NULL THEN NULL
        WHEN p_imc < 18.5 THEN 'BAJO_PESO'
        WHEN p_imc < 25   THEN 'NORMAL'
        WHEN p_imc < 30   THEN 'SOBREPESO'
        ELSE 'OBESIDAD'
    END;
END //

-- =====================================================================
-- TRIGGERS
-- =====================================================================

-- 1) Al registrar una medición, el sistema actualiza las condiciones derivadas del IMC
CREATE TRIGGER trg_medicion_actualiza_condicion
AFTER INSERT ON mediciones_corporales
FOR EACH ROW
BEGIN
    DECLARE v_clasif VARCHAR(20);
    SET v_clasif = fn_clasificar_imc(NEW.imc);

    -- desactiva las condiciones de IMC anteriores
    UPDATE usuario_condiciones uc
      JOIN condiciones c ON c.id = uc.condicion_id
       SET uc.activa = FALSE
     WHERE uc.usuario_id = NEW.usuario_id AND c.origen = 'IMC';

    -- activa la nueva (si no es NORMAL)
    IF v_clasif <> 'NORMAL' THEN
        INSERT INTO usuario_condiciones (usuario_id, condicion_id, severidad, activa, desde)
        SELECT NEW.usuario_id, c.id,
               CASE WHEN NEW.imc >= 35 OR NEW.imc < 17 THEN 3
                    WHEN NEW.imc >= 30 THEN 2 ELSE 1 END,
               TRUE, CURRENT_DATE
          FROM condiciones c WHERE c.codigo = v_clasif
        ON DUPLICATE KEY UPDATE activa = TRUE, severidad = VALUES(severidad), desde = CURRENT_DATE;
    END IF;
END //

-- 2) Última línea de defensa: la BD rechaza un ejercicio contraindicado
--    para alguna condición ACTIVA del dueño de la rutina.
CREATE TRIGGER trg_rutina_ejercicio_seguro
BEFORE INSERT ON rutina_ejercicios
FOR EACH ROW
BEGIN
    DECLARE v_conflictos INT DEFAULT 0;
    DECLARE v_msg VARCHAR(255);

    SELECT COUNT(*) INTO v_conflictos
      FROM rutina_dias rd
      JOIN rutinas r              ON r.id = rd.rutina_id
      JOIN usuario_condiciones uc ON uc.usuario_id = r.usuario_id AND uc.activa = TRUE
      JOIN contraindicaciones ci  ON ci.condicion_id = uc.condicion_id AND ci.ejercicio_id = NEW.ejercicio_id
     WHERE rd.id = NEW.rutina_dia_id;

    IF v_conflictos > 0 THEN
        SET v_msg = CONCAT('Ejercicio ', NEW.ejercicio_id, ' contraindicado para el perfil del usuario');
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = v_msg;
    END IF;
END //

-- 3) Auditoría de pagos
CREATE TRIGGER trg_pagos_auditoria
AFTER INSERT ON pagos
FOR EACH ROW
BEGIN
    INSERT INTO auditoria (tabla, registro_id, accion, usuario_id, datos)
    VALUES ('pagos', NEW.id, 'INSERT', NEW.usuario_id,
            JSON_OBJECT('monto', NEW.monto_cop, 'estado', NEW.estado,
                        'metodo', NEW.metodo, 'referencia', NEW.referencia));
END //

-- 4) Auditoría de cambios de rol / estado de usuarios
CREATE TRIGGER trg_usuarios_auditoria
AFTER UPDATE ON usuarios
FOR EACH ROW
BEGIN
    IF OLD.rol_id <> NEW.rol_id OR OLD.estado <> NEW.estado THEN
        INSERT INTO auditoria (tabla, registro_id, accion, usuario_id, datos)
        VALUES ('usuarios', NEW.id, 'UPDATE', NEW.id,
                JSON_OBJECT('rol_antes', OLD.rol_id, 'rol_despues', NEW.rol_id,
                            'estado_antes', OLD.estado, 'estado_despues', NEW.estado));
    END IF;
END //

-- 5) Una anomalía mitigada guarda su fecha de resolución
CREATE TRIGGER trg_anomalia_resuelta
BEFORE UPDATE ON anomalias
FOR EACH ROW
BEGIN
    IF NEW.estado <> 'ABIERTA' AND OLD.estado = 'ABIERTA' THEN
        SET NEW.resuelta_en = CURRENT_TIMESTAMP;
    END IF;
END //

-- =====================================================================
-- PROCEDIMIENTOS ALMACENADOS
-- =====================================================================

-- Ejercicios seguros para un usuario (los que NO chocan con sus condiciones activas).
-- El backend se los pasa a la IA como "catálogo permitido".
CREATE PROCEDURE sp_ejercicios_seguros(IN p_usuario_id INT UNSIGNED)
BEGIN
    SELECT e.id, e.nombre, e.tipo, gm.nombre AS grupo, eq.nombre AS equipo,
           e.dificultad, e.impacto, e.apto_lumbar
      FROM ejercicios e
      JOIN grupos_musculares gm ON gm.id = e.grupo_muscular_id
      JOIN equipamiento eq      ON eq.id = e.equipamiento_id
     WHERE NOT EXISTS (
            SELECT 1
              FROM contraindicaciones ci
              JOIN usuario_condiciones uc ON uc.condicion_id = ci.condicion_id
             WHERE ci.ejercicio_id = e.id
               AND uc.usuario_id = p_usuario_id
               AND uc.activa = TRUE)
     ORDER BY e.tipo, e.nombre;
END //

-- Pago simulado + activación de suscripción en UNA transacción.
-- Regla de simulación: tarjeta terminada en 0000 => RECHAZADO (fondos insuficientes).
CREATE PROCEDURE sp_simular_pago(
    IN  p_usuario_id  INT UNSIGNED,
    IN  p_plan_codigo VARCHAR(20),
    IN  p_metodo      VARCHAR(10),
    IN  p_ultimos4    CHAR(4),
    OUT p_pago_id     INT UNSIGNED,
    OUT p_estado      VARCHAR(10)
)
BEGIN
    DECLARE v_plan_id TINYINT UNSIGNED;
    DECLARE v_precio  DECIMAL(10,2);
    DECLARE v_dias    SMALLINT UNSIGNED;
    DECLARE v_sus_id  INT UNSIGNED DEFAULT NULL;
    DECLARE v_ref     VARCHAR(40);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    SELECT id, precio_cop, duracion_dias INTO v_plan_id, v_precio, v_dias
      FROM planes WHERE codigo = p_plan_codigo AND activo = TRUE;

    IF v_plan_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Plan inexistente o inactivo';
    END IF;

    SET v_ref    = CONCAT('SIM-', DATE_FORMAT(NOW(), '%Y%m%d%H%i%s'), '-', LPAD(p_usuario_id, 6, '0'),
                          '-', LPAD(FLOOR(RAND() * 10000), 4, '0'));
    SET p_estado = IF(p_metodo = 'TARJETA' AND p_ultimos4 = '0000', 'RECHAZADO', 'APROBADO');

    START TRANSACTION;

    IF p_estado = 'APROBADO' THEN
        UPDATE suscripciones SET estado = 'CANCELADA'
         WHERE usuario_id = p_usuario_id AND estado = 'ACTIVA';

        INSERT INTO suscripciones (usuario_id, plan_id, fecha_inicio, fecha_fin, estado)
        VALUES (p_usuario_id, v_plan_id, CURRENT_DATE,
                IF(v_dias IS NULL, NULL, DATE_ADD(CURRENT_DATE, INTERVAL v_dias DAY)), 'ACTIVA');
        SET v_sus_id = LAST_INSERT_ID();
    END IF;

    INSERT INTO pagos (usuario_id, suscripcion_id, monto_cop, metodo, ultimos4, referencia, estado, motivo_rechazo)
    VALUES (p_usuario_id, v_sus_id, v_precio, p_metodo, p_ultimos4, v_ref, p_estado,
            IF(p_estado = 'RECHAZADO', 'Fondos insuficientes (simulado)', NULL));
    SET p_pago_id = LAST_INSERT_ID();

    COMMIT;
END //

-- Cupo de IA: ¿cuántas rutinas puede generar aún este mes?
CREATE PROCEDURE sp_cupo_ia(IN p_usuario_id INT UNSIGNED, OUT p_restantes INT)
BEGIN
    DECLARE v_cupo INT DEFAULT 0;
    DECLARE v_usadas INT DEFAULT 0;

    SELECT COALESCE(MAX(p.rutinas_ia_mes), 0) INTO v_cupo
      FROM suscripciones s JOIN planes p ON p.id = s.plan_id
     WHERE s.usuario_id = p_usuario_id AND s.estado = 'ACTIVA';

    SELECT COUNT(*) INTO v_usadas
      FROM solicitudes_ia
     WHERE usuario_id = p_usuario_id AND estado = 'OK'
       AND creado_en >= DATE_FORMAT(CURRENT_DATE, '%Y-%m-01');

    SET p_restantes = GREATEST(v_cupo - v_usadas, 0);
END //

DELIMITER ;

-- =====================================================================
-- VISTAS (consumidas por dashboards y reportes Pandas)
-- =====================================================================

-- Estado actual de cada usuario: última medición, IMC, plan vigente
CREATE VIEW v_usuario_resumen AS
SELECT u.id AS usuario_id,
       CONCAT(u.nombres, ' ', u.apellidos) AS nombre,
       u.email,
       r.codigo AS rol,
       m.peso_kg, m.estatura_cm, m.imc,
       fn_clasificar_imc(m.imc) AS clasificacion_imc,
       ps.objetivo, ps.nivel_actividad,
       p.nombre AS plan,
       p.con_publicidad
  FROM usuarios u
  JOIN roles r ON r.id = u.rol_id
  LEFT JOIN perfiles_salud ps ON ps.usuario_id = u.id
  LEFT JOIN mediciones_corporales m
         ON m.id = (SELECT m2.id FROM mediciones_corporales m2
                     WHERE m2.usuario_id = u.id
                     ORDER BY m2.registrado_en DESC, m2.id DESC LIMIT 1)
  LEFT JOIN suscripciones s ON s.usuario_id = u.id AND s.estado = 'ACTIVA'
  LEFT JOIN planes p ON p.id = s.plan_id;

-- Progreso de peso e IMC en el tiempo
CREATE VIEW v_progreso_corporal AS
SELECT usuario_id, DATE(registrado_en) AS fecha, peso_kg, imc,
       fn_clasificar_imc(imc) AS clasificacion
  FROM mediciones_corporales;

-- Adherencia semanal: sesiones completadas y dolor promedio
CREATE VIEW v_adherencia_semanal AS
SELECT usuario_id,
       YEARWEEK(fecha, 3) AS semana_iso,
       COUNT(*) AS sesiones,
       SUM(completada) AS completadas,
       ROUND(AVG(esfuerzo_percibido), 1) AS rpe_promedio,
       ROUND(AVG(dolor_reportado), 1) AS dolor_promedio
  FROM sesiones_entrenamiento
 GROUP BY usuario_id, YEARWEEK(fecha, 3);

-- Ingresos simulados por mes y plan (reporte administrativo)
CREATE VIEW v_ingresos_mensuales AS
SELECT DATE_FORMAT(pg.creado_en, '%Y-%m') AS mes,
       pl.nombre AS plan,
       COUNT(*) AS pagos_aprobados,
       SUM(pg.monto_cop) AS total_cop
  FROM pagos pg
  JOIN suscripciones s ON s.id = pg.suscripcion_id
  JOIN planes pl       ON pl.id = s.plan_id
 WHERE pg.estado = 'APROBADO'
 GROUP BY DATE_FORMAT(pg.creado_en, '%Y-%m'), pl.nombre;

-- Salud de servicios para la consola de monitoreo
CREATE VIEW v_salud_servicios AS
SELECT s.codigo, s.nombre, s.estado, s.replicas_actuales,
       (SELECT COUNT(*) FROM anomalias a
         WHERE a.servicio_id = s.id AND a.estado = 'ABIERTA') AS anomalias_abiertas,
       (SELECT MAX(a.detectada_en) FROM anomalias a
         WHERE a.servicio_id = s.id) AS ultima_anomalia
  FROM servicios s;

-- Uso y costo de IA por día
CREATE VIEW v_uso_ia_diario AS
SELECT DATE(creado_en) AS dia, proveedor, modelo,
       COUNT(*) AS solicitudes,
       SUM(estado = 'OK') AS exitosas,
       SUM(estado = 'RECHAZADA_VALIDACION') AS rechazadas_por_seguridad,
       ROUND(AVG(latencia_ms)) AS latencia_promedio_ms,
       SUM(tokens_entrada) AS tokens_entrada,
       SUM(tokens_salida)  AS tokens_salida
  FROM solicitudes_ia
 GROUP BY DATE(creado_en), proveedor, modelo;
