import { createContext, useContext, type ReactNode } from 'react';
import type { EstadoMonitor, ServicioSalud } from '@fitia/shared';
import { admin } from '../api';
import { usePolling, type Sondeo } from '../hooks/usePolling';

export interface Salud {
  servicios: ServicioSalud[];
  estado: EstadoMonitor;
}

const Ctx = createContext<Sondeo<Salud> | null>(null);

/** Estado global de la plataforma (cabecera, punto vivo del menú y Resumen). Solo para ADMIN. */
export function SaludProvider({ activo, children }: { activo: boolean; children: ReactNode }) {
  return activo ? <Sondeando>{children}</Sondeando> : <Ctx.Provider value={null}>{children}</Ctx.Provider>;
}

function Sondeando({ children }: { children: ReactNode }) {
  const sondeo = usePolling<Salud>(async () => {
    const [servicios, estado] = await Promise.all([admin.monitoreo.servicios(), admin.monitoreo.estado()]);
    return { servicios, estado };
  }, 5000);
  return <Ctx.Provider value={sondeo}>{children}</Ctx.Provider>;
}

export const useSalud = () => useContext(Ctx);

export function resumenSalud(s: Salud | undefined) {
  const abiertas = s?.servicios.reduce((n, x) => n + Number(x.anomalias_abiertas), 0) ?? 0;
  const api = s?.servicios.find((x) => x.codigo === 'api');
  const p95 = s?.estado.lineas_base.find((b) => b.servicio === 'api' && b.metrica === 'LATENCIA_MS')?.p95 ?? null;
  return { abiertas, api, p95, proveedor: s?.estado.ia.efectivo ?? null };
}
