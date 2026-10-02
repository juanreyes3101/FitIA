// Utilidades de presentación de rutinas, semanas y fechas (sin lógica de negocio: esa vive en la API).
import type { Rutina, RutinaDia, RutinaEjercicio, SemanaAdherencia } from '@fitia/shared';

export const DOW = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];

export function tiempo(seg: number): string {
  if (seg >= 60) {
    const m = Math.floor(seg / 60);
    const s = seg % 60;
    return s ? `${m} min ${s} s` : `${m} min`;
  }
  return `${seg} s`;
}

/** "3 × 12", "3 × 30 s" o "11 min" */
export function dosis(e: Pick<RutinaEjercicio, 'series' | 'repeticiones' | 'duracion_seg'>): string {
  if (e.repeticiones) return `${e.series} × ${e.repeticiones}`;
  if (e.duracion_seg) return e.series > 1 ? `${e.series} × ${tiempo(e.duracion_seg)}` : tiempo(e.duracion_seg);
  return `${e.series} series`;
}

export const descanso = (e: Pick<RutinaEjercicio, 'descanso_seg'>) => (e.descanso_seg ? tiempo(e.descanso_seg) : '—');

/** Misma estimación que la regla 3 del validador: series × (duración o reps × 4 s) + series × descanso. */
export function minutosDia(d: RutinaDia): number {
  const seg = d.ejercicios.reduce(
    (t, e) => t + e.series * ((e.duracion_seg ?? (e.repeticiones ?? 0) * 4) + e.descanso_seg),
    0,
  );
  return Math.max(1, Math.round(seg / 60));
}

export const seriesDia = (d: RutinaDia) => d.ejercicios.reduce((t, e) => t + e.series, 0);

/** YEARWEEK(fecha, 3) de MySQL: año ISO × 100 + semana ISO. */
export function semanaIso(fecha = new Date()): number {
  const d = new Date(Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()));
  const dia = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dia);
  const inicioAnio = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const semana = Math.ceil(((d.getTime() - inicioAnio.getTime()) / 86400000 + 1) / 7);
  return d.getUTCFullYear() * 100 + semana;
}

export function sesionesEstaSemana(adh: SemanaAdherencia[]): number {
  return adh.find((s) => s.semana_iso === semanaIso())?.sesiones ?? 0;
}

/** Entreno de hoy: el siguiente día de la rutina según las sesiones ya hechas esta semana. */
export function diaDeHoy(rutina: Rutina, sesionesSemana: number): RutinaDia | undefined {
  if (!rutina.dias.length) return undefined;
  return rutina.dias[sesionesSemana % rutina.dias.length];
}

/** Semanas seguidas (hasta la actual o la anterior) con 2 sesiones o más. */
export function racha(adh: SemanaAdherencia[]): number {
  const porSemana = new Map(adh.map((s) => [s.semana_iso, s.sesiones]));
  let fecha = new Date();
  // Si esta semana todavía no llega a 2, la racha cuenta desde la semana pasada
  if ((porSemana.get(semanaIso(fecha)) ?? 0) < 2) fecha = new Date(fecha.getTime() - 7 * 86400000);
  let n = 0;
  while ((porSemana.get(semanaIso(fecha)) ?? 0) >= 2) {
    n++;
    fecha = new Date(fecha.getTime() - 7 * 86400000);
  }
  return n;
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export const fechaCorta = (iso: string) => {
  const [a, m, d] = iso.slice(0, 10).split('-').map(Number);
  return `${d} ${MESES[m - 1]}${a !== new Date().getFullYear() ? ` ${a}` : ''}`;
};

export function hoyLargo(): string {
  return new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'short' })
    .format(new Date())
    .replace(',', '')
    .replace('.', '')
    .toUpperCase();
}
