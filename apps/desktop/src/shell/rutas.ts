import { useEffect, useState } from 'react';
import type { Rol } from '@fitia/shared';
import { ICONOS } from '../ui/Iconos';

export type Ruta = 'resumen' | 'usuarios' | 'entrenadores' | 'ejercicios' | 'planes' | 'reportes' | 'monitoreo' | 'config';

export const NAV: { id: Ruta; etiqueta: string; titulo: string; icono: string; roles: Rol[] }[] = [
  { id: 'resumen', etiqueta: 'Resumen', titulo: 'Resumen', icono: ICONOS.resumen, roles: ['ADMIN'] },
  { id: 'usuarios', etiqueta: 'Usuarios', titulo: 'Usuarios', icono: ICONOS.usuarios, roles: ['ADMIN'] },
  { id: 'entrenadores', etiqueta: 'Entrenadores', titulo: 'Entrenadores', icono: ICONOS.entrenadores, roles: ['ADMIN', 'ENTRENADOR'] },
  { id: 'ejercicios', etiqueta: 'Ejercicios', titulo: 'Ejercicios y contraindicaciones', icono: ICONOS.ejercicios, roles: ['ADMIN'] },
  { id: 'planes', etiqueta: 'Planes y anuncios', titulo: 'Planes y anuncios', icono: ICONOS.planes, roles: ['ADMIN'] },
  { id: 'reportes', etiqueta: 'Reportes', titulo: 'Reportes', icono: ICONOS.reportes, roles: ['ADMIN'] },
  { id: 'monitoreo', etiqueta: 'Monitoreo', titulo: 'Monitoreo', icono: ICONOS.monitoreo, roles: ['ADMIN'] },
  { id: 'config', etiqueta: 'Configuración', titulo: 'Configuración', icono: ICONOS.config, roles: ['ADMIN', 'ENTRENADOR'] },
];

export const rutasDe = (rol: Rol) => NAV.filter((n) => n.roles.includes(rol));
export const inicioDe = (rol: Rol): Ruta => (rol === 'ADMIN' ? 'resumen' : 'entrenadores');

function leer(): string {
  return (window.location.hash || '').replace(/^#\/?/, '').split('?')[0];
}

/** Rutas por hash, como el diseño (#/monitoreo): funcionan igual en app:// y en el servidor de Vite. */
export function useRuta(rol: Rol): [Ruta, (r: Ruta) => void] {
  const permitidas = rutasDe(rol).map((n) => n.id);
  const resolver = (h: string): Ruta => (permitidas.includes(h as Ruta) ? (h as Ruta) : inicioDe(rol));
  const [ruta, setRuta] = useState<Ruta>(() => resolver(leer()));

  useEffect(() => {
    const alCambiar = () => setRuta(resolver(leer()));
    window.addEventListener('hashchange', alCambiar);
    alCambiar();
    return () => window.removeEventListener('hashchange', alCambiar);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rol]);

  return [ruta, (r: Ruta) => {
    window.location.hash = `#/${r}`;
  }];
}
