import { useEffect, useRef, type ReactNode } from 'react';

/** Diálogo modal propio (nada de window.confirm, que bloquea la ventana). Esc o clic afuera cierran. */
export function Dialogo({ titulo, abierto, alCerrar, children, ancho = 'max-w-[460px]' }: {
  titulo: string; abierto: boolean; alCerrar: () => void; children: ReactNode; ancho?: string;
}) {
  const caja = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!abierto) return;
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && alCerrar();
    window.addEventListener('keydown', tecla);
    caja.current?.querySelector<HTMLElement>('input, select, textarea, button')?.focus();
    return () => window.removeEventListener('keydown', tecla);
  }, [abierto, alCerrar]);

  if (!abierto) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-6" onMouseDown={(e) => e.target === e.currentTarget && alCerrar()}>
      <div ref={caja} role="dialog" aria-modal="true" aria-label={titulo} className={`flex max-h-full w-full ${ancho} animate-entrada-corta flex-col gap-4 overflow-auto rounded border border-grafito bg-concreto p-5 shadow-flotante`}>
        <h2 className="titulo-panel">{titulo}</h2>
        {children}
      </div>
    </div>
  );
}
