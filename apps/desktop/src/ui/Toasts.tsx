import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export type TipoToast = 'ok' | 'warn' | 'err' | 'ia' | 'sig';

// Colores e íconos del diseño (FitIA Control.dc.html)
const TOAST: Record<TipoToast, [string, string]> = {
  ok: ['#3DDC84', 'M4 12l5 5L20 6'],
  warn: ['#FFB020', 'M12 3l10 18H2zM12 10v5M12 18v1'],
  err: ['#FF3B3B', 'M6 6l12 12M18 6L6 18'],
  ia: ['#D4FF00', 'M12 3l2 7 7 2-7 2-2 7-2-7-7-2 7-2z'],
  sig: ['#FF4D1A', 'M2 12h4l3-8 4 16 3-8h6'],
};

interface Toast {
  id: number;
  tipo: TipoToast;
  titulo: string;
  mensaje: string;
}

type Avisar = (tipo: TipoToast, titulo: string, mensaje?: string) => void;
const Ctx = createContext<Avisar>(() => undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const avisar = useCallback<Avisar>((tipo, titulo, mensaje = '') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, tipo, titulo, mensaje }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  const valor = useMemo(() => avisar, [avisar]);
  return (
    <Ctx.Provider value={valor}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed bottom-5 right-5 z-[90] flex w-[360px] flex-col gap-2">
        {toasts.map((t) => {
          const [fondo, d] = TOAST[t.tipo];
          return (
            <div key={t.id} role="status" className="pointer-events-auto flex animate-entrada-corta items-stretch overflow-hidden rounded border border-grafito bg-concreto shadow-flotante">
              <div className="flex w-11 flex-none items-center justify-center" style={{ background: fondo }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0B0B0C" strokeWidth="2.5" strokeLinecap="square">
                  <path d={d} />
                </svg>
              </div>
              <div className="min-w-0 flex-1 px-3 py-[10px]">
                <div className="font-bold">{t.titulo}</div>
                {t.mensaje && <div className="text-[13px] text-niebla">{t.mensaje}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
