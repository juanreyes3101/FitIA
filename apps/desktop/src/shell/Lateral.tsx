import { iniciales, nombreCompleto } from '../lib/formato';
import type { UsuarioSesion } from '../sesion/SesionContext';
import { Icono } from '../ui/Iconos';
import { rutasDe, type Ruta } from './rutas';

export function Lateral({ usuario, ruta, ir, abiertas, salir }: {
  usuario: UsuarioSesion; ruta: Ruta; ir: (r: Ruta) => void; abiertas: number | null; salir: () => void;
}) {
  return (
    <aside className="flex w-[208px] flex-none flex-col overflow-y-auto border-r border-grafito bg-asfalto px-[10px] pb-3 pt-[14px] min-[1500px]:w-[232px]">
      <div className="flex items-center gap-[10px] px-2 pb-4 pt-[2px]">
        <span className="font-titulo text-[22px] leading-none">
          FIT<span className="text-voltaje">IA</span>
        </span>
        <span className="rounded-sm border border-voltaje px-[5px] py-[3px] font-metrica text-[10px] font-bold tracking-[.08em] text-voltaje">CONTROL</span>
      </div>
      <nav aria-label="Principal" className="flex flex-col gap-[2px]">
        {rutasDe(usuario.rol).map((n) => {
          const activa = n.id === ruta;
          return (
            <button
              key={n.id}
              type="button"
              onClick={() => ir(n.id)}
              aria-current={activa ? 'page' : undefined}
              title={n.etiqueta}
              className={`relative flex min-h-[40px] items-center gap-[10px] rounded px-[10px] text-left text-[14px] transition-colors hover:bg-concreto hover:text-hueso ${
                activa ? 'bg-concreto font-bold text-hueso' : 'font-semibold text-niebla'
              }`}
            >
              <span className={`absolute bottom-2 left-0 top-2 w-[3px] ${activa ? 'bg-voltaje' : ''}`} />
              <Icono d={n.icono} className="flex-none" />
              <span className="flex-1 whitespace-nowrap">{n.etiqueta}</span>
              {n.id === 'monitoreo' && abiertas !== null && (
                <span className={`h-2 w-2 animate-pulso rounded-full ${abiertas ? 'bg-senal' : 'bg-exito'}`} aria-label={abiertas ? 'Con anomalías' : 'Sin anomalías'} />
              )}
            </button>
          );
        })}
      </nav>
      <div className="mt-auto flex flex-col gap-[10px] border-t border-grafito px-2 pt-3">
        <div className="flex items-center gap-[10px]">
          <span className="flex h-8 w-8 flex-none items-center justify-center rounded-sm bg-hueso font-titulo text-[14px] text-asfalto">{iniciales(usuario)}</span>
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-semibold">{nombreCompleto(usuario)}</span>
            <span className="block text-[12px] text-niebla">{usuario.rol === 'ADMIN' ? 'Administrador' : 'Entrenador'}</span>
          </span>
        </div>
        <button type="button" onClick={salir} className="min-h-[36px] rounded border border-grafito text-[13px] font-semibold text-niebla hover:border-hueso hover:text-hueso">
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
