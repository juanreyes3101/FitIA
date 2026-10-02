// apps/mobile está FUERA de los workspaces de npm (usa React 19; la web usa React 18), así que tiene
// su propio árbol completo en apps/mobile/node_modules. Metro vigila además packages/shared, que llega
// como enlace simbólico (file:../../packages/shared) y no importa ningún paquete: nunca se resuelve
// el React 18 de la raíz.
const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const proyecto = __dirname;
const config = getDefaultConfig(proyecto);
config.watchFolders = [...(config.watchFolders ?? []), path.resolve(proyecto, '../../packages/shared')];
config.resolver.nodeModulesPaths = [path.resolve(proyecto, 'node_modules')];

module.exports = config;
