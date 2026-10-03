/** Interruptor (role="switch") del diseño de escritorio. */
export function Interruptor({ activo, alCambiar, etiqueta, deshabilitado }: {
  activo: boolean; alCambiar: (v: boolean) => void; etiqueta: string; deshabilitado?: boolean;
}) {
  return (
    <button type="button" role="switch" aria-checked={activo} aria-label={etiqueta} disabled={deshabilitado}
      onClick={() => alCambiar(!activo)}
      className="inline-flex items-center gap-2 text-[12px] font-bold disabled:cursor-not-allowed disabled:opacity-50">
      <span className={activo ? 'text-exito' : 'text-niebla'}>{activo ? 'ACTIVO' : 'PAUSADO'}</span>
      <span className={`relative h-5 w-9 rounded-sm border transition-colors ${activo ? 'border-exito bg-exito/20' : 'border-grafito bg-asfalto'}`}>
        <span className={`absolute top-[2px] h-[14px] w-[14px] rounded-sm transition-[left] duration-150 ${activo ? 'left-[18px] bg-exito' : 'left-[2px] bg-tenue'}`} />
      </span>
    </button>
  );
}
