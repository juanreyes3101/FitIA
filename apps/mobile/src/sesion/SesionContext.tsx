import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ApiError, type Perfil, type RegistroEntrada, type RespuestaAuth, type Usuario } from '@fitia/shared';
import { alCerrarSesion, almacenMovil, api } from '../api';
import { borrar, guardar, leer } from '../lib/almacen';

const CLAVE_USUARIO = 'fitia.usuario';

/** sinConexion: hay sesión guardada pero la API no responde (no se borra: se reintenta). */
type Estado = 'cargando' | 'anonimo' | 'autenticado' | 'sinConexion';

export interface ResultadoEntrada {
  usuario: Usuario;
  /** false si es ADMIN o ENTRENADOR: usan FitIA Control (escritorio) */
  permitido: boolean;
  tienePerfil: boolean;
}

interface Sesion {
  estado: Estado;
  usuario: Usuario | null;
  perfil: Perfil | null;
  login(email: string, password: string): Promise<ResultadoEntrada>;
  registro(datos: RegistroEntrada): Promise<ResultadoEntrada>;
  logout(): Promise<void>;
  /** Vuelve a pedir GET /perfil (después de pagar, medir o cambiar el perfil). */
  recargarPerfil(): Promise<Perfil | null>;
  /** Para respuestas que ya traen el perfil nuevo (PUT /perfil) */
  setPerfil(p: Perfil): void;
  reintentar(): void;
}

const Ctx = createContext<Sesion | null>(null);

export function SesionProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<Estado>('cargando');
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [intento, setIntento] = useState(0);

  const cerrar = useCallback(async () => {
    await almacenMovil.limpiar();
    await borrar(CLAVE_USUARIO);
    setUsuario(null);
    setPerfil(null);
    setEstado('anonimo');
  }, []);

  useEffect(() => alCerrarSesion(() => void cerrar()), [cerrar]);

  const recargarPerfil = useCallback(async () => {
    try {
      const p = await api.perfil.obtener();
      setPerfil(p);
      return p;
    } catch {
      return null;
    }
  }, []);

  // Al abrir la app: con el refresh guardado se pide un access nuevo y se recupera la sesión
  useEffect(() => {
    let vivo = true;
    (async () => {
      const [refresh, guardado] = await Promise.all([almacenMovil.obtenerRefresh(), leer(CLAVE_USUARIO)]);
      if (!refresh || !guardado) {
        if (vivo) setEstado('anonimo');
        return;
      }
      try {
        const { access_token } = await api.auth.refresh(refresh);
        await almacenMovil.guardar(access_token);
        const p = await api.perfil.obtener();
        if (!vivo) return;
        setUsuario(JSON.parse(guardado) as Usuario);
        setPerfil(p);
        setEstado('autenticado');
      } catch (e) {
        if (!vivo) return;
        // Sin red no se pierde la sesión; un refresh vencido o inválido sí la cierra
        if (e instanceof ApiError && e.codigo === 'SIN_CONEXION') setEstado('sinConexion');
        else await cerrar();
      }
    })();
    return () => {
      vivo = false;
    };
  }, [intento, cerrar]);

  const entrar = useCallback(
    async (resp: RespuestaAuth): Promise<ResultadoEntrada> => {
      const u = resp.usuario;
      // La app es para el rol USUARIO; admin y entrenador usan FitIA Control
      if (u.rol !== 'USUARIO') return { usuario: u, permitido: false, tienePerfil: false };
      await almacenMovil.guardar(resp.access_token, resp.refresh_token);
      await guardar(CLAVE_USUARIO, JSON.stringify(u));
      setUsuario(u);
      const p = await recargarPerfil();
      setEstado('autenticado');
      return { usuario: u, permitido: true, tienePerfil: !!p?.perfil };
    },
    [recargarPerfil],
  );

  const valor = useMemo<Sesion>(
    () => ({
      estado,
      usuario,
      perfil,
      login: async (email, password) => entrar(await api.auth.login(email, password)),
      registro: async (datos) => entrar(await api.auth.registro(datos)),
      logout: cerrar,
      recargarPerfil,
      setPerfil,
      reintentar: () => {
        setEstado('cargando');
        setIntento((n) => n + 1);
      },
    }),
    [estado, usuario, perfil, entrar, cerrar, recargarPerfil],
  );

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useSesion(): Sesion {
  const s = useContext(Ctx);
  if (!s) throw new Error('useSesion fuera de SesionProvider');
  return s;
}

/** Iniciales para el avatar ("Laura Gómez" → "LG"). */
export function iniciales(nombre: string | null | undefined): string {
  const p = (nombre ?? '').trim().split(/\s+/).filter(Boolean);
  return ((p[0]?.[0] ?? '') + (p[1]?.[0] ?? '')).toUpperCase() || 'FI';
}
