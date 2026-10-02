import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';

export type Variante = 'primario' | 'secundario' | 'fantasma' | 'peligro';
type Tam = 'md' | 'lg' | 'sm';

// Primario: Voltaje con sombra "golpe" que se aplasta 2 px al presionar (90 ms).
const BASE =
  'inline-flex items-center justify-center gap-2.5 rounded font-semibold no-underline select-none ' +
  'transition-[transform,box-shadow,background-color,color] duration-golpe ease-fitia ' +
  'disabled:cursor-not-allowed disabled:opacity-40 aria-disabled:cursor-not-allowed aria-disabled:opacity-40';

const VARIANTES: Record<Variante, string> = {
  primario:
    'bg-voltaje text-asfalto shadow-golpe hover:bg-voltaje-hover hover:text-asfalto active:translate-y-0.5 active:shadow-golpe-2 ' +
    'focus-visible:outline-hueso',
  secundario:
    'border-2 border-hueso text-hueso hover:bg-hueso hover:text-asfalto active:translate-y-0.5',
  fantasma: 'text-hueso hover:bg-grafito hover:text-hueso',
  peligro: 'border-2 border-error text-error hover:bg-error hover:text-asfalto active:translate-y-0.5',
};

const TAMANOS: Record<Tam, string> = {
  sm: 'min-h-[44px] px-4 text-[15px]',
  md: 'min-h-[52px] px-6 text-base',
  lg: 'min-h-[56px] px-7 text-[17px]',
};

export const clasesBoton = (v: Variante = 'primario', t: Tam = 'md', extra = '') =>
  `${BASE} ${VARIANTES[v]} ${TAMANOS[t]} ${extra}`;

type PropsBoton = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: Variante;
  tam?: Tam;
  cargando?: boolean;
  children: ReactNode;
};

export const Boton = forwardRef<HTMLButtonElement, PropsBoton>(function Boton(
  { variante = 'primario', tam = 'md', cargando, className = '', children, disabled, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={clasesBoton(variante, tam, className)}
      disabled={disabled || cargando}
      aria-busy={cargando || undefined}
      {...props}
    >
      {cargando && <span className="h-4 w-4 animate-spin border-2 border-current border-t-transparent" aria-hidden />}
      {children}
    </button>
  );
});

export function BotonLink({
  variante = 'primario',
  tam = 'md',
  className = '',
  ...props
}: LinkProps & { variante?: Variante; tam?: Tam }) {
  return <Link className={clasesBoton(variante, tam, className)} {...props} />;
}

/** Enlace subrayado en Voltaje ("Ver la comparación completa →") */
export function EnlaceSubrayado({ className = '', ...props }: LinkProps) {
  return (
    <Link
      className={
        'inline-flex min-h-[44px] items-center gap-2 self-start px-1 font-semibold text-voltaje no-underline ' +
        'shadow-[inset_0_-2px_0_#D4FF00] hover:text-hueso hover:shadow-[inset_0_-2px_0_#F2F0EB] ' +
        className
      }
      {...props}
    />
  );
}
