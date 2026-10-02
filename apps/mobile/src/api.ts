import Constants from 'expo-constants';
import { crearClienteApi, crearEndpoints, type AlmacenTokens } from '@fitia/shared';
import { borrar, guardar, leer } from './lib/almacen';

const CLAVE_ACCESS = 'fitia.access';
const CLAVE_REFRESH = 'fitia.refresh';

// Móvil: los dos tokens viven en expo-secure-store (docs/02_arquitectura.md §8).
// El access también se cachea en memoria para no leer el Keystore en cada petición.
let access: string | null = null;

export const almacenMovil: AlmacenTokens = {
  obtenerAccess: async () => access ?? (access = await leer(CLAVE_ACCESS)),
  obtenerRefresh: () => leer(CLAVE_REFRESH),
  async guardar(a, r) {
    access = a;
    await guardar(CLAVE_ACCESS, a);
    if (r !== undefined) await guardar(CLAVE_REFRESH, r);
  },
  async limpiar() {
    access = null;
    await Promise.all([borrar(CLAVE_ACCESS), borrar(CLAVE_REFRESH)]);
  },
};

/**
 * URL de la API. Primero EXPO_PUBLIC_API_URL (apps/mobile/.env). Si no está, se usa la IP con la que
 * Expo Go encontró a Metro (la de la PC en la WiFi): así sigue funcionando aunque cambie la IP.
 */
function urlApi(): string {
  const env = process.env.EXPO_PUBLIC_API_URL;
  if (env) return env;
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return `http://${host ?? 'localhost'}:5000/api/v1`;
}

export const API_URL = urlApi();

const sesionCerradaListeners = new Set<() => void>();
export const alCerrarSesion = (fn: () => void) => {
  sesionCerradaListeners.add(fn);
  return () => {
    sesionCerradaListeners.delete(fn);
  };
};

export const cliente = crearClienteApi({
  baseUrl: API_URL,
  almacen: almacenMovil,
  onSesionCerrada: () => sesionCerradaListeners.forEach((fn) => fn()),
});

export const api = crearEndpoints(cliente);
