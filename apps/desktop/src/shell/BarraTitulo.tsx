import { useEffect, useState } from 'react';
import { Logo } from '../ui/Iconos';

/** Barra de título propia (la ventana no tiene marco): arrastrable, con minimizar, maximizar y cerrar. */
export function BarraTitulo({ titulo }: { titulo: string }) {
  const puente = window.fitia;
  const [maximizada, setMaximizada] = useState(false);
  useEffect(() => puente?.ventana.alMaximizar(setMaximizada), [puente]);
  useEffect(() => {
    document.title = `FitIA Control — ${titulo}`;
  }, [titulo]);

  const boton = 'sin-arrastre flex h-full w-[46px] items-center justify-center text-plata';
  return (
    <div className="arrastre flex h-8 flex-none select-none items-center border-b border-grafito bg-carbon">
      <div className="flex min-w-0 flex-1 items-center gap-2 px-3">
        <Logo className="flex-none text-voltaje" />
        <span className="truncate text-[12px] text-plata">FitIA Control — {titulo}</span>
      </div>
      {puente && (
        <div className="flex h-full">
          <button type="button" aria-label="Minimizar" className={`${boton} hover:bg-grafito`} onClick={() => void puente.ventana.minimizar()}>
            <svg width="10" height="10" viewBox="0 0 10 10"><path d="M0 5h10" stroke="currentColor" /></svg>
          </button>
          <button type="button" aria-label={maximizada ? 'Restaurar' : 'Maximizar'} className={`${boton} hover:bg-grafito`} onClick={() => void puente.ventana.maximizar()}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              {maximizada ? (
                <path d="M2.5.5h7v7M.5 2.5h7v7h-7z" stroke="currentColor" />
              ) : (
                <rect x=".5" y=".5" width="9" height="9" stroke="currentColor" />
              )}
            </svg>
          </button>
          <button type="button" aria-label="Cerrar" className={`${boton} hover:bg-[#E81123] hover:text-white`} onClick={() => void puente.ventana.cerrar()}>
            <svg width="10" height="10" viewBox="0 0 10 10"><path d="M0 0l10 10M10 0L0 10" stroke="currentColor" /></svg>
          </button>
        </div>
      )}
    </div>
  );
}
