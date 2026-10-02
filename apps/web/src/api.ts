import { crearClienteApi, crearEndpoints, type AlmacenTokens } from '@fitia/shared';

const CLAVE_REFRESH = 'fitia.refresh';

// Web: el access token vive solo en memoria; el refresh en localStorage para sobrevivir a recargar
// la página (el backend lo entrega en el cuerpo, no en cookie httpOnly; ver apps/web/README.md).
let access: string | null = null;

function leerRefresh(): string | null {
  try {
    return localStorage.getItem(CLAVE_REFRESH);
  } catch {
    return null;
  }
}

export const almacenWeb: AlmacenTokens = {
  obtenerAccess: () => access,
  obtenerRefresh: leerRefresh,
  guardar(a, r) {
    access = a;
    if (r !== undefined) {
      try {
        localStorage.setItem(CLAVE_REFRESH, r);
      } catch {
        /* navegación privada: la sesión dura lo que dure la pestaña */
      }
    }
  },
  limpiar() {
    access = null;
    try {
      localStorage.removeItem(CLAVE_REFRESH);
    } catch {
      /* nada que limpiar */
    }
  },
};

const sesionCerradaListeners = new Set<() => void>();
export const alCerrarSesion = (fn: () => void) => {
  sesionCerradaListeners.add(fn);
  return () => {
    sesionCerradaListeners.delete(fn);
  };
};

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api/v1';

export const cliente = crearClienteApi({
  baseUrl: API_URL,
  almacen: almacenWeb,
  onSesionCerrada: () => sesionCerradaListeners.forEach((fn) => fn()),
});

export const api = crearEndpoints(cliente);
export const hayRefreshGuardado = () => !!leerRefresh();
