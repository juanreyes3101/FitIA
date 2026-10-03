// Trazos de los íconos de la barra lateral (FitIA Control.dc.html).
export const ICONOS = {
  resumen: 'M3 3h8v8H3zM13 3h8v5h-8zM13 10h8v11h-8zM3 13h8v8H3z',
  usuarios: 'M9 4h6v6H9zM4 21l2-7h12l2 7',
  entrenadores: 'M6 7v10M3 9v6M18 7v10M21 9v6M6 12h12',
  ejercicios: 'M4 4h16v16H4zM4 10h16M10 4v16',
  planes: 'M3 7h18v12H3zM3 11h18M7 15h4',
  reportes: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  monitoreo: 'M2 12h4l3-8 4 16 3-8h6',
  config: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2',
  rayo: 'M13 2L4 14h7l-1 8 9-12h-7z',
} as const;

export function Icono({ d, tam = 20, grosor = 2, className }: { d: string; tam?: number; grosor?: number; className?: string }) {
  return (
    <svg width={tam} height={tam} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={grosor} strokeLinecap="square" className={className} aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

/** Logo FitIA (mancuerna + pulso + destello), el mismo de la barra de título del diseño. */
export function Logo({ ancho = 18, alto = 14, className = 'text-voltaje' }: { ancho?: number; alto?: number; className?: string }) {
  return (
    <svg viewBox="0 0 48 36" width={ancho} height={alto} className={className} aria-hidden="true">
      <g fill="currentColor">
        <rect x="2" y="12" width="6" height="24" />
        <rect x="8" y="17" width="4" height="14" />
        <rect x="40" y="12" width="6" height="24" />
        <rect x="36" y="17" width="4" height="14" />
        <path d="M43 0l1.4 3.6L48 5l-3.6 1.4L43 10l-1.4-3.6L38 5l3.6-1.4z" />
      </g>
      <path d="M12 24h5l3-8 5 16 3-10 2 2h6" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square" />
    </svg>
  );
}
