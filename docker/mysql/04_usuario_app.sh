#!/bin/bash
# Usuario con el que se conectan la API y el worker dentro de Docker.
# Mínimo privilegio: recibe rol_api (database/roles_usuarios.sql), es decir, leer, escribir,
# ejecutar procedimientos y ver la definición de las vistas. No puede crear ni borrar tablas.
# '%' = puede entrar desde otro contenedor de la red de Docker (no solo desde localhost).
# La imagen de MySQL corre este archivo una sola vez, la primera vez que se crea el volumen.

mysql --protocol=socket -uroot -p"${MYSQL_ROOT_PASSWORD}" <<SQL
CREATE USER IF NOT EXISTS 'fitia_app'@'%' IDENTIFIED BY '${FITIA_DB_PASSWORD}';
GRANT rol_api TO 'fitia_app'@'%';
SET DEFAULT ROLE ALL TO 'fitia_app'@'%';
SQL

echo "FitIA: usuario fitia_app creado con rol_api"
