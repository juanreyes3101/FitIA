import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Perfil, RegistroEntrada, Rol } from '@fitia/shared';
import { alCerrarSesion, almacenWeb, api, hayRefreshGuardado } from '../api';

export interface UsuarioSesion {
  id: number;
  rol: Rol;
  nombres: string;
  apellidos: string;
  email: string;
}

type Estado = 'cargando' | 'anonimo' | 'autenticado';

/** Lo que devuelve login/registro: con quién entró y si ya completó el onboarding. */
export interface ResultadoEntrada {
  usuario: UsuarioSesion;
  tienePerfil: boolean;
}

interface Sesion {
  estado: Estado;
  usuario: UsuarioSesion | null;
  perfil: Perfil | null;
  login(email: string, password: string): Promise<ResultadoEntrada>;
  registro(datos: RegistroEntrada): Promise<ResultadoEntrada>;
  logout(): void;
  /** Vuelve a pedir GET /perfil (después de pagar, medir o cambiar el perfil). */
  recargarPerfil(): Promise<Perfil | null>;
  setPerfil(p: Perfil): void;
}

const Ctx = createContext<Sesion | null>(null);

/** Lee los claims del JWT (sin verificarlo: solo para enrutar; la API valida de verdad). */
function claims(token: string | null): { sub?: string; rol?: Rol } {
  try {
    const payload = token!.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(decodeURIComponent(escape(atob(payload))));
  } catch {
    return {};
  }
}

function separarNombre(nombre: string | null) {
  const partes = (nombre ?? '').trim().split(/\s+/);
  return { nombres: partes[0] ?? '', apellidos: partes.slice(1).join(' ') };
}

export function SesionProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<Estado>(hayRefreshGuardado() ? 'cargando' : 'anonimo');
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);

  const cerrar = useCallback(() => {
    almacenWeb.limpiar();
    setUsuario(null);
    setPerfil(null);
    setEstado('anonimo');
  }, []);

  useEffect(() => alCerrarSesion(cerrar), [cerrar]);

  const recargarPerfil = useCallback(async () => {
    try {
      const p = await api.perfil.obtener();
      setPerfil(p);
      return p;
    } catch {
      return null;
    }
  }, []);

  // Al recargar la página: el refresh guardado emite un access nuevo y se recupera la sesión
  useEffect(() => {
    if (estado !== 'cargando') return;
    (async () => {
      try {
        const { access_token: token } = await api.auth.refresh(almacenWeb.obtenerRefresh() as string);
        almacenWeb.guardar(token);
        const c = claims(token);
        if (c.rol !== 'USUARIO') throw new Error('rol');
        const p = await api.perfil.obtener();
        setPerfil(p);
        setUsuario({ id: Number(c.sub), rol: c.rol ?? 'USUARIO', email: p.email ?? '', ...separarNombre(p.nombre) });
        setEstado('autenticado');
      } catch {
        cerrar();
      }
    })();
  }, [estado, cerrar]);

  const entrar = useCallback(
    async (resp: Awaited<ReturnType<typeof api.auth.login>>): Promise<ResultadoEntrada> => {
      const u = resp.usuario;
      const sesion: UsuarioSesion = { id: u.id, rol: u.rol, nombres: u.nombres, apellidos: u.apellidos, email: u.email };
      // La web es para el rol USUARIO; admin y entrenador usan FitIA Control (escritorio)
      if (u.rol !== 'USUARIO') return { usuario: sesion, tienePerfil: false };
      almacenWeb.guardar(resp.access_token, resp.refresh_token);
      setUsuario(sesion);
      const p = await recargarPerfil();
      setEstado('autenticado');
      return { usuario: sesion, tienePerfil: !!p?.perfil };
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
