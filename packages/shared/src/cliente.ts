import type { AlmacenTokens } from './almacen';
import type { CuerpoError } from './tipos';

/** Error con el formato único del backend: {"error": {"codigo", "mensaje"}}. */
export class ApiError extends Error {
  constructor(
    public readonly codigo: string,
    mensaje: string,
    public readonly status: number,
  ) {
    super(mensaje);
    this.name = 'ApiError';
  }
}

export interface OpcionesCliente {
  /** p. ej. http://localhost:5000/api/v1 */
  baseUrl: string;
  almacen: AlmacenTokens;
  /** Se llama cuando el refresh falla: la sesión ya no sirve. */
  onSesionCerrada?: () => void;
}

export interface OpcionesPeticion {
  metodo?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  cuerpo?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  /** false = no manda el token (endpoints públicos). */
  auth?: boolean;
  /** Token explícito (p. ej. el refresh para /auth/refresh). Desactiva el refresh automático. */
  token?: string;
  signal?: AbortSignal;
}

export type ClienteApi = <T>(ruta: string, opciones?: OpcionesPeticion) => Promise<T>;

const SIN_CONEXION = 'No pudimos conectarnos con FitIA. Revisa tu internet e intenta de nuevo.';

export function crearClienteApi({ baseUrl, almacen, onSesionCerrada }: OpcionesCliente): ClienteApi {
  const base = baseUrl.replace(/\/+$/, '');
  // Un solo refresh en curso aunque fallen varias peticiones a la vez
  let refrescando: Promise<boolean> | null = null;

  async function refrescar(): Promise<boolean> {
    const refresh = await almacen.obtenerRefresh();
    if (!refresh) return false;
    try {
      const resp = await fetch(`${base}/auth/refresh`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${refresh}` },
      });
      if (!resp.ok) return false;
      const datos = (await resp.json()) as { access_token: string };
      await almacen.guardar(datos.access_token);
      return true;
    } catch {
      return false;
    }
  }

  function url(ruta: string, query?: OpcionesPeticion['query']): string {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query ?? {})) {
      if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
    }
    const qs = params.toString();
    return `${base}${ruta}${qs ? `?${qs}` : ''}`;
  }

  async function enviar(ruta: string, op: OpcionesPeticion): Promise<Response> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (op.cuerpo !== undefined) headers['Content-Type'] = 'application/json';
    if (op.token) {
      headers.Authorization = `Bearer ${op.token}`;
    } else if (op.auth !== false) {
      const token = await almacen.obtenerAccess();
      if (token) headers.Authorization = `Bearer ${token}`;
    }
    try {
      return await fetch(url(ruta, op.query), {
        method: op.metodo ?? 'GET',
        headers,
        body: op.cuerpo !== undefined ? JSON.stringify(op.cuerpo) : undefined,
        signal: op.signal,
      });
    } catch (e) {
      if ((e as Error).name === 'AbortError') throw e;
      throw new ApiError('SIN_CONEXION', SIN_CONEXION, 0);
    }
  }

  return async function peticion<T>(ruta: string, op: OpcionesPeticion = {}): Promise<T> {
    let resp = await enviar(ruta, op);

    // Access vencido o ausente: un intento de refresh y se repite la petición una vez
    if (resp.status === 401 && op.auth !== false && !op.token) {
      refrescando ??= refrescar().finally(() => {
        refrescando = null;
      });
      if (await refrescando) {
        resp = await enviar(ruta, op);
      } else {
        await almacen.limpiar();
        onSesionCerrada?.();
      }
    }

    const texto = await resp.text();
    const datos = texto ? safeJson(texto) : null;
    if (!resp.ok) {
      const err = (datos as CuerpoError | null)?.error;
      throw new ApiError(
        err?.codigo ?? 'ERROR_INTERNO',
        err?.mensaje ?? 'Ocurrió un error inesperado. Intenta de nuevo.',
        resp.status,
      );
    }
    return datos as T;
  };
}

function safeJson(texto: string): unknown {
  try {
    return JSON.parse(texto);
  } catch {
    return null;
  }
}
