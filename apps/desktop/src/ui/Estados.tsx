import type { ReactNode } from 'react';
import { Boton } from './Boton';

/** ApiError trae el mensaje del backend ya listo para mostrar. */
export function mensajeError(e: unknown): string {
  if (e instanceof Error) return e.message;
  return 'Ocurrió un error inesperado.';
}

export function Cargando({ texto = 'Cargando…', alto = 'min-h-[160px]' }: { texto?: string; alto?: string }) {
  return (
    <div role="status" className={`flex ${alto} items-center justify-center gap-3 text-niebla`}>
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-grafito border-t-voltaje" />
      <span className="text-[13px]">{texto}</span>
    </div>
  );
}

export function ErrorEstado({ error, reintentar, compacto }: { error: unknown; reintentar?: () => void; compacto?: boolean }) {
  return (
    <div role="alert" className={`flex flex-col items-start gap-3 rounded border border-error/60 bg-error/[.06] ${compacto ? 'p-3' : 'p-4'}`}>
      <div>
        <p className="font-bold text-error">No pudimos cargar esto</p>
        <p className="text-[13px] text-niebla">{mensajeError(error)}</p>
      </div>
      {reintentar && (
        <Boton chico onClick={reintentar}>
          Reintentar
        </Boton>
      )}
    </div>
  );
}

export function Vacio({ titulo, children }: { titulo: string; children?: ReactNode }) {
  return (
    <div className="flex min-h-[120px] flex-col items-center justify-center gap-1 rounded border border-dashed border-grafito p-4 text-center">
      <p className="font-bold">{titulo}</p>
      {children && <div className="text-[13px] text-niebla">{children}</div>}
    </div>
  );
}
