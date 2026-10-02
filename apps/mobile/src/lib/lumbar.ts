import type { Ejercicio } from '@fitia/shared';

/** Rutina rápida de espalda: 5 de movilidad o estiramiento aptos para lumbar, 1 × 2 min (≈ 10 min). */
export function rapidaLumbar(lista: Ejercicio[]): Ejercicio[] {
  return lista.filter((e) => e.tipo === 'MOVILIDAD' || e.tipo === 'ESTIRAMIENTO').slice(0, 5);
}

export const SEG_RAPIDA = 120;
export const DESCANSO_RAPIDA = 15;
