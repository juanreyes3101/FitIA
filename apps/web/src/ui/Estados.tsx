// Estados de carga, vacío y error que lleva cada pantalla.
import type { ReactNode } from 'react';
import { ApiError } from '@fitia/shared';
import { Boton } from './Boton';
import { Icono } from './Iconos';

export function Cargando({ texto = 'Cargando…', alto = 'min-h-[320px]' }: { texto?: string; alto?: string }) {
  return (
    <div role="status" aria-live="polite" className={`flex flex-col justify-center gap-4 ${alto}`}>
      <div className="flex gap-1" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="h-2 w-10 animate-pulso bg-voltaje" style={{ animationDelay: `${i * 150}ms` }} />
        ))}
      </div>
      <span className="font-metrica text-[13px] uppercase tracking-[.06em] text-niebla">{texto}</span>
    </div>
  );
}

/** Bloques grises con la forma del contenido (esqueleto). */
export function Esqueleto({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`animate-pulso rounded bg-concreto ${className}`} />;
}

export function Vacio({
  numero = '00',
  titulo,
  texto,
  accion,
}: {
  numero?: string;
  titulo: string;
  texto: ReactNode;
  accion?: ReactNode;
}) {
  return (
    <div className="relative flex flex-col items-start gap-4 overflow-hidden rounded border border-dashed border-grafito p-8 md:p-12">
      <span aria-hidden className="pointer-events-none absolute -right-2 -top-6 font-titulo text-[160px] leading-none text-[#1F1F23]">
        {numero}
      </span>
      <h2 className="relative font-titulo text-[36px] uppercase leading-none">{titulo}</h2>
      <p className="relative max-w-[460px] text-niebla">{texto}</p>
      {accion && <div className="relative mt-2">{accion}</div>}
    </div>
  );
}

export function mensajeError(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  return 'Ocurrió un error inesperado. Intenta de nuevo.';
}

export function ErrorEstado({ error, onReintentar }: { error: unknown; onReintentar?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-4 rounded border-2 border-error/60 bg-error/5 p-6 md:p-8">
      <span className="flex items-center gap-2 etiqueta text-error">
        <Icono nombre="alerta" tam={18} /> ALGO SALIÓ MAL
      </span>
      <p className="max-w-[520px] text-lg">{mensajeError(error)}</p>
      {onReintentar && (
        <Boton variante="secundario" tam="sm" onClick={onReintentar}>
          Reintentar
        </Boton>
      )}
    </div>
  );
}

type Tono = 'info' | 'exito' | 'advertencia' | 'error' | 'ia';
const TONOS: Record<Tono, { borde: string; texto: string; icono: Parameters<typeof Icono>[0]['nombre'] }> = {
  info: { borde: 'border-grafito', texto: 'text-hueso', icono: 'chispa' },
  exito: { borde: 'border-exito', texto: 'text-exito', icono: 'check' },
  advertencia: { borde: 'border-advertencia', texto: 'text-advertencia', icono: 'alerta' },
  error: { borde: 'border-error', texto: 'text-error', icono: 'alerta' },
  ia: { borde: 'border-voltaje', texto: 'text-voltaje', icono: 'ia' },
};

/** Aviso en línea (rutina base segura, cupo agotado, pago rechazado…). */
export function Aviso({
  tono = 'info',
  titulo,
  children,
  accion,
}: {
  tono?: Tono;
  titulo?: string;
  children: ReactNode;
  accion?: ReactNode;
}) {
  const t = TONOS[tono];
  return (
    <div role={tono === 'error' ? 'alert' : 'status'} className={`flex items-start gap-3.5 rounded border ${t.borde} p-4 md:px-5`}>
      <Icono nombre={t.icono} tam={22} className={`mt-0.5 flex-none ${t.texto}`} />
      <div className="flex flex-1 flex-col gap-2 text-[15px] text-niebla">
        <p>
          {titulo && <strong className="text-hueso">{titulo} </strong>}
          {children}
        </p>
        {accion}
      </div>
    </div>
  );
}

export function AvisoSalud({ children }: { children?: ReactNode }) {
  return (
    <Aviso tono="advertencia" titulo="FitIA no reemplaza a un profesional de la salud.">
      {children ?? 'Si el dolor es fuerte, no mejora en dos semanas o baja por la pierna, consulta a un profesional de la salud.'}
    </Aviso>
  );
}

export function Proximamente() {
  return (
    <span className="inline-flex items-center gap-1 rounded-sm border border-grafito px-2 py-1 text-[11px] font-bold tracking-[.08em] text-niebla">
      <Icono nombre="candado" tam={12} /> PRÓXIMAMENTE
    </span>
  );
}
