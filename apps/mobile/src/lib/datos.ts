import { useSyncExternalStore } from 'react';
import { ApiError, type Rutina } from '@fitia/shared';
import { api } from '../api';
import { guardar, leer } from './almacen';

/** GET /rutinas/activa, pero 404 SIN_RUTINA es el estado vacío (null), no un error. */
export async function rutinaActivaONula(): Promise<Rutina | null> {
  try {
    return await api.rutinas.activa();
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

/** YYYY-MM-DD en la hora local del celular */
export const hoyIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// ---- Última sesión de hoy (para "¡Hoy ya cumpliste!"). La API no tiene historial por día:
// se guarda en el celular solo la de hoy, con su RPE y dolor.
export interface SesionHoy {
  fecha: string;
  rpe: number;
  dolor: number;
}
const CLAVE = 'fitia.sesionHoy';
let actual: SesionHoy | null = null;
const oyentes = new Set<() => void>();
leer(CLAVE).then((v) => {
  if (!v) return;
  try {
    actual = JSON.parse(v) as SesionHoy;
    oyentes.forEach((f) => f());
  } catch {
    /* dato viejo o dañado */
  }
});

export function marcarSesionHoy(rpe: number, dolor: number) {
  actual = { fecha: hoyIso(), rpe, dolor };
  void guardar(CLAVE, JSON.stringify(actual));
  oyentes.forEach((f) => f());
}

export function useSesionHoy(): SesionHoy | null {
  const s = useSyncExternalStore(
    (f) => {
      oyentes.add(f);
      return () => oyentes.delete(f);
    },
    () => actual,
  );
  return s && s.fecha === hoyIso() ? s : null;
}
