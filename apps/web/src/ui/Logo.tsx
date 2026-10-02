// Logo de FitIA: pesa + pulso + chispa (FitIA Marca · 01 logo).
export function Simbolo({ ancho = 44, className = '' }: { ancho?: number; className?: string }) {
  return (
    <svg viewBox="0 0 48 36" width={ancho} className={`block h-auto text-voltaje ${className}`} aria-hidden>
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

export function Logo({ ancho = 44, tamTexto = 30 }: { ancho?: number; tamTexto?: number }) {
  return (
    <span className="flex items-center gap-2.5 text-hueso">
      <Simbolo ancho={ancho} />
      <span className="font-titulo leading-none tracking-[.01em]" style={{ fontSize: tamTexto }}>
        FIT<span className="text-voltaje">IA</span>
      </span>
    </span>
  );
}
