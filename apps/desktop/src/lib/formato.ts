// Formatos en español de Colombia (coma decimal, punto de miles).
const n0 = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });
const cop = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

export const entero = (v: number | null | undefined) => (v == null || Number.isNaN(v) ? '—' : n0.format(v));
export const decimal = (v: number | null | undefined, d = 1) =>
  v == null || Number.isNaN(v)
    ? '—'
    : new Intl.NumberFormat('es-CO', { minimumFractionDigits: d, maximumFractionDigits: d }).format(v);
export const pesos = (v: number | null | undefined) => (v == null ? '—' : cop.format(v).replace(/\s/g, ''));
export const porcentaje = (v: number | null | undefined, d = 1) => (v == null ? '—' : `${decimal(v * 100, d)} %`);

/** La API manda fechas locales sin zona ("2026-10-03T10:41:00"): se leen como hora local. */
export const fecha = (iso: string) => new Date(iso);

export const hora = (iso: string | Date) =>
  (typeof iso === 'string' ? fecha(iso) : iso).toLocaleTimeString('es-CO', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });

export const horaCorta = (iso: string | Date) =>
  (typeof iso === 'string' ? fecha(iso) : iso).toLocaleTimeString('es-CO', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  });

export const dia = (iso: string) =>
  fecha(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }).replace('.', '');

export const hoyLargo = (d = new Date()) =>
  d.toLocaleDateString('es-CO', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' })
    .replace(/\./g, '').replace(/,/g, '').toUpperCase();

export function duracion(seg: number): string {
  const s = Math.max(0, Math.round(seg));
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  return `${m} min ${String(s % 60).padStart(2, '0')} s`;
}

export const nombreCompleto = (u: { nombres: string; apellidos: string }) => `${u.nombres} ${u.apellidos}`.trim();

export const iniciales = (u: { nombres: string; apellidos: string }) =>
  `${u.nombres[0] ?? ''}${u.apellidos[0] ?? ''}`.toUpperCase();
