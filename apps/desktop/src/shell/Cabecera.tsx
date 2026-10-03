import { useEffect, useState } from 'react';
import { entero, hora } from '../lib/formato';
import { resumenSalud, useSalud } from './SaludContext';

export function useReloj(): string {
  const [ahora, setAhora] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setAhora(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return hora(ahora);
}

export function Cabecera({ irMonitoreo }: { irMonitoreo: (() => void) | null }) {
  const reloj = useReloj();
  const salud = useSalud();
  const { abiertas, api, p95, proveedor } = resumenSalud(salud?.datos);
  const sinDatos = !salud || (!salud.datos && !salud.error);
  const caida = !!salud?.error && !salud.datos;

  const [texto, color] = caida
    ? ['API sin respuesta', 'senal']
    : abiertas
      ? [`${abiertas} ${abiertas === 1 ? 'anomalía abierta' : 'anomalías abiertas'}`, 'senal']
      : ['Todos los sistemas operativos', 'exito'];
  const tono = color === 'senal'
    ? { borde: 'border-senal', fondo: 'bg-senal/[.12]', texto: 'text-senal', punto: 'bg-senal' }
    : { borde: 'border-exito', fondo: 'bg-exito/10', texto: 'text-exito', punto: 'bg-exito' };

  return (
    <header className="flex h-[52px] flex-none items-center gap-[14px] border-b border-grafito bg-asfalto px-5">
      {irMonitoreo && !sinDatos && (
        <button type="button" onClick={irMonitoreo} className={`inline-flex min-h-[34px] flex-none items-center gap-[10px] whitespace-nowrap rounded border px-3 text-[13px] font-bold ${tono.borde} ${tono.fondo} ${tono.texto}`}>
          <span className="relative h-[10px] w-[10px] flex-none">
            <span className={`absolute inset-0 rounded-full ${tono.punto}`} />
            <span className={`absolute inset-0 animate-ping rounded-full ${tono.punto}`} />
          </span>
          {texto}
        </button>
      )}
      {irMonitoreo && salud?.datos && (
        <span className="truncate whitespace-nowrap font-metrica text-[12px] text-niebla">
          IA: <span className="text-hueso">{proveedor === 'gemini' ? 'Gemini' : 'Mock'}</span> · API {api?.replicas_actuales ?? '—'} réplicas · p95 {entero(p95)} ms
        </span>
      )}
      <span className="flex-1" />
      <span className="whitespace-nowrap font-metrica text-[13px] font-bold cifra">{reloj}</span>
      <span title="Las métricas son reales; el escalado y los reinicios son simulados" className="whitespace-nowrap rounded-sm border border-advertencia px-[7px] py-1 text-[12px] font-bold tracking-[.06em] text-advertencia">
        REMEDIACIÓN SIMULADA
      </span>
    </header>
  );
}
