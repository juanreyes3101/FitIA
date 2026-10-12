-- =====================================================================
--  FitIA — Roles y usuarios de MySQL (principio de mínimo privilegio)
--  Ejecutar DESPUÉS de schema.sql y seed.sql, conectado como root.
--  Cambien las contraseñas antes de usarlo fuera de la demo.
-- =====================================================================

-- 1. ROLES: agrupan permisos
CREATE ROLE IF NOT EXISTS rol_api, rol_reportes, rol_dba;

-- La API: leer y escribir datos y ejecutar procedimientos. NO puede borrar tablas ni cambiar la estructura.
GRANT SELECT, INSERT, UPDATE, DELETE, EXECUTE ON fitia.* TO rol_api;

-- Reportes: SOLO lectura y SOLO de las vistas (no ve contraseñas ni datos crudos)
GRANT SELECT ON fitia.v_usuario_resumen    TO rol_reportes;
GRANT SELECT ON fitia.v_progreso_corporal  TO rol_reportes;
GRANT SELECT ON fitia.v_adherencia_semanal TO rol_reportes;
GRANT SELECT ON fitia.v_ingresos_mensuales TO rol_reportes;
GRANT SELECT ON fitia.v_salud_servicios    TO rol_reportes;
GRANT SELECT ON fitia.v_uso_ia_diario      TO rol_reportes;

-- Administrador de la base de datos: control total, solo sobre fitia
GRANT ALL PRIVILEGES ON fitia.* TO rol_dba;

-- 2. USUARIOS: cada uno recibe un rol
CREATE USER IF NOT EXISTS 'fitia_api'@'localhost'      IDENTIFIED BY 'Api_Demo2026*';
CREATE USER IF NOT EXISTS 'fitia_reportes'@'localhost' IDENTIFIED BY 'Rep_Demo2026*';
CREATE USER IF NOT EXISTS 'fitia_dba'@'localhost'      IDENTIFIED BY 'Dba_Demo2026*';

GRANT rol_api      TO 'fitia_api'@'localhost';
GRANT rol_reportes TO 'fitia_reportes'@'localhost';
GRANT rol_dba      TO 'fitia_dba'@'localhost';

SET DEFAULT ROLE ALL TO 'fitia_api'@'localhost', 'fitia_reportes'@'localhost', 'fitia_dba'@'localhost';

-- 3. VERIFICAR (para mostrar en clase)
SHOW GRANTS FOR 'fitia_reportes'@'localhost' USING rol_reportes;
SELECT user, host FROM mysql.user WHERE user LIKE 'fitia%';
