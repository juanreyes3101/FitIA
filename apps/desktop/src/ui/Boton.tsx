import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variante = 'primario' | 'senal' | 'claro' | 'secundario' | 'fantasma' | 'peligro';

const ESTILOS: Record<Variante, string> = {
  // CTA Voltaje con la sombra "golpe" del diseño
  primario: 'bg-voltaje text-asfalto shadow-golpe-chico hover:bg-voltaje-hover active:translate-y-[2px] active:shadow-none',
  senal: 'bg-senal text-asfalto shadow-senal active:translate-y-[2px] active:shadow-senal-2',
  claro: 'bg-hueso text-asfalto hover:bg-yeso',
  secundario: 'border border-grafito bg-transparent text-hueso hover:border-hueso',
  fantasma: 'bg-transparent text-niebla hover:text-hueso',
  peligro: 'border border-error/60 bg-error/10 text-error hover:bg-error/20',
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  chico?: boolean;
  icono?: ReactNode;
}

export function Boton({ variante = 'secundario', chico, icono, className = '', children, ...resto }: Props) {
  return (
    <button
      type="button"
      {...resto}
      className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded font-bold transition-[transform,box-shadow,background-color,border-color] duration-[90ms] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none ${
        chico ? 'min-h-[32px] px-3 text-[13px]' : 'min-h-[36px] px-[14px] text-[13px]'
      } ${ESTILOS[variante]} ${className}`}
    >
      {icono}
      {children}
    </button>
  );
}
