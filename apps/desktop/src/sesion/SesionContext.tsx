import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ApiError, type Rol } from '@fitia/shared';
import { alCerrarSesion, almacen, api, iniciarConfig, iniciarSesionGuardada, recordarSesion,
  type SesionGuardada } from '../api';

export type UsuarioSesion = SesionGuardada['usuario'];
type Estado = 'cargando' | 'anonimo' | 'autenticado';

/** FitIA Control es solo para el equipo: el rol USUARIO usa la web o la app móvil. */
export const ROLES_CONSOLA: Rol[] = ['ADMIN', 'ENTRENADOR'];

interface Sesion {
  estado: Estado;
  usuario: UsuarioSesion | null;
  login(email: string, password: string): Promise<UsuarioSesion>;
  logout(): void;
}

const Ctx = createContext<Sesion | null>(null);

export function SesionProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<Estado>('cargando');
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);

  const cerrar = useCallback(() => {
    almacen.limpiar();
    setUsuario(null);
    setEstado('anonimo');
  }, []);

  useEffect(() => alCerrarSesion(cerrar), [cerrar]);

  // Al abrir la app: con el refresh guardado (cifrado) se pide un access nuevo
  useEffect(() => {
    (async () => {
      await iniciarConfig();
      const guardada = await iniciarSesionGuardada();
      if (!guardada) return setEstado('anonimo');
      try {
        const { access_token: token } = await api.auth.refresh(guardada.refresh);
        almacen.guardar(token);
        setUsuario(guardada.usuario);
        setEstado('autenticado');
      } catch (e) {
        // Sin conexión no se borra la sesión guardada: se puede reintentar al cambiar la URL
        if (!(e instanceof ApiError && e.codigo === 'SIN_CONEXION')) almacen.limpiar();
        setEstado('anonimo');
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const resp = await api.auth.login(email, password);
    const u = resp.usuario;
    if (!ROLES_CONSOLA.includes(u.rol)) {
      throw new ApiError('PROHIBIDO', 'FitIA Control es para administradores y entrenadores. Usa la app FitIA.', 403);
    }
    const datos: UsuarioSesion = { id: u.id, nombres: u.nombres, apellidos: u.apellidos, email: u.email, rol: u.rol };
    recordarSesion({ refresh: resp.refresh_token, usuario: datos }, resp.access_token);
    setUsuario(datos);
    setEstado('autenticado');
    return datos;
  }, []);

  const valor = useMemo<Sesion>(() => ({ estado, usuario, login, logout: cerrar }), [estado, usuario, login, cerrar]);
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useSesion(): Sesion {
  const s = useContext(Ctx);
  if (!s) throw new Error('useSesion fuera de SesionProvider');
  return s;
}
