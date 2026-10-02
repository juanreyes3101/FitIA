// Iconos del sistema: trazo 2 px, esquinas rectas (FitIA Marca · 05 lenguaje gráfico).
import type { SVGProps } from 'react';

export const RUTAS_ICONO = {
  inicio: 'M3 11l9-7 9 7v10H3zM10 21v-6h4v6',
  rutina: 'M6 7v10M3 9v6M18 7v10M21 9v6M6 12h12',
  entreno: 'M13 2L4 14h7l-1 8 9-12h-7z',
  progreso: 'M3 20h18M4 16l5-5 4 3 7-7M15 7h5v5',
  lumbar: 'M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z',
  planes: 'M3 7h18v12H3zM3 11h18M7 15h4',
  perfil: 'M8 4h8v8H8zM4 21l2-5h12l2 5',
  flecha: 'M4 12h15M13 6l6 6-6 6',
  atras: 'M20 12H5M11 6l-6 6 6 6',
  check: 'M4 12l5 5L20 6',
  cerrar: 'M6 6l12 12M18 6L6 18',
  menu: 'M3 6h18M3 12h18M3 18h18',
  alerta: 'M12 3l10 18H2zM12 10v5M12 18v1',
  chispa: 'M12 3l2 7 7 2-7 2-2 7-2-7-7-2 7-2z',
  reloj: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 7v5l3 3',
  ojo: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 100 6 3 3 0 000-6z',
  ojoNo: 'M3 3l18 18M10.6 6.1A10 10 0 0112 6c6 0 10 6 10 6a17 17 0 01-3.2 3.8M6.6 6.6C3.9 8.4 2 12 2 12s4 7 10 7a9.6 9.6 0 004.4-1.1',
  play: 'M7 4l13 8-13 8z',
  pausa: 'M6 4h4v16H6zM14 4h4v16h-4z',
  buscar: 'M10 3a7 7 0 100 14 7 7 0 000-14zM21 21l-6-6',
  descarga: 'M12 3v12M6 10l6 6 6-6M4 21h16',
  candado: 'M5 11h14v10H5zM8 11V7a4 4 0 018 0v4',
  ia: 'M12 3l2 7 7 2-7 2-2 7-2-7-7-2 7-2z',
  anuncio: 'M4 7h16v10H4zM8 11h4',
  salir: 'M15 4h5v16h-5M10 8l-4 4 4 4M6 12h11',
  rayo: 'M13 2L4 14h7l-1 8 9-12h-7z',
} as const;

export type NombreIcono = keyof typeof RUTAS_ICONO;

export function Icono({
  nombre,
  tam = 20,
  grosor = 2,
  ...props
}: { nombre: NombreIcono; tam?: number; grosor?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={tam}
      height={tam}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={grosor}
      strokeLinecap="square"
      aria-hidden="true"
      {...props}
    >
      <path d={RUTAS_ICONO[nombre]} />
    </svg>
  );
}
