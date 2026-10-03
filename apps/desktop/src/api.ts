import {
  crearClienteApi, crearEndpoints, crearEndpointsAdmin, type AlmacenTokens, type ClienteApi, type Rol,
} from '@fitia/shared';

export const API_POR_DEFECTO = 'http://localhost:5000/api/v1';

/** Lo que se guarda cifrado (safeStorage) para reabrir la app sin volver a ingresar. */
export interface SesionGuardada {
  refresh: string;
  usuario: { id: number; nombres: string; apellidos: string; email: string; rol: Rol };
}

const puente = typeof window !== 'undefined' ? window.fitia : undefined;
const CLAVE_LOCAL = 'fitia.control.sesion';
const CLAVE_URL = 'fitia.control.api';

// ---------------------------------------------------------------- persistencia (Electron o navegador)
// Sin Electron (renderer abierto en un navegador para revisión) se cae a localStorage.
async function leerGuardada(): Promise<SesionGuardada | null> {
  try {
    const texto = puente ? await puente.sesion.obtener() : localStorage.getItem(CLAVE_LOCAL);
    return texto ? (JSON.parse(texto) as SesionGuardada) : null;
  } catch {
    return null;
  }
}

async function escribirGuardada(s: SesionGuardada | null): Promise<void> {
  const texto = s ? JSON.stringify(s) : null;
  try {
    if (puente) await puente.sesion.guardar(texto);
    else if (texto) localStorage.setItem(CLAVE_LOCAL, texto);
    else localStorage.removeItem(CLAVE_LOCAL);
  } catch {
    /* sin persistencia: la sesión dura lo que dure la ventana */
  }
}

// ---------------------------------------------------------------- tokens
let access: string | null = null;
let guardada: SesionGuardada | null = null;

export const almacen: AlmacenTokens = {
  obtenerAccess: () => access,
  obtenerRefresh: () => guardada?.refresh ?? null,
  guardar(a, r) {
    access = a;
    if (r !== undefined && guardada) {
      guardada = { ...guardada, refresh: r };
      void escribirGuardada(guardada);
    }
  },
  limpiar() {
    access = null;
    guardada = null;
    void escribirGuardada(null);
  },
};

export async function iniciarSesionGuardada(): Promise<SesionGuardada | null> {
  guardada = await leerGuardada();
  return guardada;
}

export function recordarSesion(s: SesionGuardada, accessToken: string): void {
  guardada = s;
  access = accessToken;
  void escribirGuardada(s);
}

const oyentesCierre = new Set<() => void>();
export const alCerrarSesion = (fn: () => void) => {
  oyentesCierre.add(fn);
  return () => {
    oyentesCierre.delete(fn);
  };
};

// ---------------------------------------------------------------- URL de la API (configurable)
let apiUrl = API_POR_DEFECTO;
let cliente: ClienteApi = crear(apiUrl);

function crear(baseUrl: string): ClienteApi {
  return crearClienteApi({ baseUrl, almacen, onSesionCerrada: () => oyentesCierre.forEach((fn) => fn()) });
}

export async function iniciarConfig(): Promise<string> {
  try {
    apiUrl = puente ? (await puente.config.obtener()).apiUrl : localStorage.getItem(CLAVE_URL) || API_POR_DEFECTO;
  } catch {
    apiUrl = API_POR_DEFECTO;
  }
  cliente = crear(apiUrl);
  return apiUrl;
}

export const obtenerApiUrl = () => apiUrl;

export async function cambiarApiUrl(nueva: string): Promise<string> {
  const limpia = nueva.trim().replace(/\/+$/, '');
  const u = new URL(limpia); // lanza si no es una URL
  if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('La URL debe empezar por http:// o https://');
  if (puente) await puente.config.guardar(limpia);
  else localStorage.setItem(CLAVE_URL, limpia);
  apiUrl = limpia;
  cliente = crear(apiUrl);
  return apiUrl;
}

/** Comprueba GET /health de una URL antes de guardarla. */
export async function probarApi(url: string): Promise<{ ok: boolean; mensaje: string }> {
  try {
    const resp = await fetch(`${url.trim().replace(/\/+$/, '')}/health`, { signal: AbortSignal.timeout(4000) });
    const datos = (await resp.json()) as { estado?: string; bd?: string };
    return resp.ok
      ? { ok: true, mensaje: `API en línea · BD ${datos.bd ?? 'OK'}` }
      : { ok: false, mensaje: `La API respondió ${resp.status} (BD ${datos.bd ?? '?'})` };
  } catch {
    return { ok: false, mensaje: 'No hay respuesta en esa dirección. ¿Está corriendo la API?' };
  }
}

// El cliente cambia si cambia la URL: se delega siempre en el actual
const delegado: ClienteApi = (ruta, op) => cliente(ruta, op);
export const api = crearEndpoints(delegado);
export const admin = crearEndpointsAdmin(delegado);
