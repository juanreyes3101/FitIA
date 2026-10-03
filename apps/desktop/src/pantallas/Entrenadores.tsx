import { useState } from 'react';
import { OBJETIVOS, etiqueta, type RevisionRutina, type RutinaPendiente } from '@fitia/shared';
import { admin } from '../api';
import { useDatos } from '../hooks/useDatos';
import { dia, horaCorta, iniciales, nombreCompleto } from '../lib/formato';
import { useSesion } from '../sesion/SesionContext';
import { Boton } from '../ui/Boton';
import { Cargando, ErrorEstado, mensajeError } from '../ui/Estados';
import { useToast } from '../ui/Toasts';

export default function Entrenadores() {
  const { usuario } = useSesion();
  const esAdmin = usuario?.rol === 'ADMIN';
  const avisar = useToast();
  const cola = useDatos(() => admin.entrenador.pendientes(), []);
  // La lista de entrenadores sale de /admin/usuarios, que es solo para ADMIN
  const equipo = useDatos(() => (esAdmin ? admin.usuarios.listar({ rol: 'ENTRENADOR' }) : Promise.resolve([])), [esAdmin]);
  const [abierta, setAbierta] = useState<number | null>(null);
  const [nota, setNota] = useState('');
  const [ocupada, setOcupada] = useState<number | null>(null);

  async function revisar(r: RutinaPendiente, datos: RevisionRutina, texto: string) {
    setOcupada(r.id);
    try {
      await admin.entrenador.revisar(r.id, datos);
      // APROBAR y RECHAZAR la sacan de la cola; AJUSTAR la deja con la nota del revisor
      if (datos.accion !== 'AJUSTAR') cola.setDatos((cola.datos ?? []).filter((x) => x.id !== r.id));
      avisar('ok', texto, `${r.usuario} · ${r.nombre}`);
      setAbierta(null);
      setNota('');
    } catch (e) {
      avisar('err', 'No se pudo guardar la revisión', mensajeError(e));
    } finally {
      setOcupada(null);
    }
  }

  const pendientes = cola.datos ?? [];
  return (
    <div className="flex animate-entrada flex-col gap-[14px]">
      <header>
        <div className="kicker">
          {esAdmin && equipo.datos ? `${equipo.datos.length} ENTRENADORES · ` : ''}{cola.datos ? `${pendientes.length} RUTINAS POR REVISAR` : 'COLA DE REVISIÓN'}
        </div>
        <h1 className="titulo-pagina">Entrenadores</h1>
      </header>

      {esAdmin && (
        equipo.error ? <ErrorEstado error={equipo.error} reintentar={equipo.recargar} compacto /> : (
          <div className="grid grid-cols-3 gap-[10px]">
            {(equipo.datos ?? []).map((t) => (
              <div key={t.id} className="panel flex flex-col gap-3 p-[14px]">
                <span className="flex items-center gap-[10px]">
                  <span className="flex h-10 w-10 flex-none items-center justify-center rounded-sm bg-voltaje font-titulo text-[16px] text-asfalto">{iniciales(t)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{nombreCompleto(t)}</span>
                    <span className="block truncate text-[12px] text-niebla">{t.email}</span>
                  </span>
                  <span className={`text-[11px] font-bold ${t.estado === 'ACTIVO' ? 'text-exito' : 'text-niebla'}`}>● {t.estado === 'ACTIVO' ? 'ACTIVO' : 'INACTIVO'}</span>
                </span>
                <span className="font-metrica text-[12px] text-niebla">Último acceso: {t.ultimo_acceso ? `${dia(t.ultimo_acceso)} ${horaCorta(t.ultimo_acceso)}` : 'nunca'}</span>
              </div>
            ))}
            {equipo.datos && !equipo.datos.length && (
              <p className="col-span-3 text-[13px] text-niebla">No hay entrenadores. Créalos en Usuarios con el rol Entrenador.</p>
            )}
          </div>
        )
      )}

      <div className="panel flex flex-col gap-3 p-[14px]">
        <div className="flex items-baseline justify-between">
          <span className="titulo-panel">RUTINAS POR REVISAR</span>
          <span className="font-metrica text-[12px] text-niebla">GENERADAS POR IA · VALIDADAS POR SEGURIDAD</span>
        </div>
        {cola.cargando && !cola.datos ? <Cargando /> : cola.error ? <ErrorEstado error={cola.error} reintentar={cola.recargar} /> : !pendientes.length ? (
          <div className="flex flex-col items-center gap-1 py-8 text-center">
            <div className="font-titulo text-[28px] text-exito">COLA AL DÍA</div>
            <div className="text-[13px] text-niebla">No hay rutinas pendientes de revisión.</div>
          </div>
        ) : (
          <div className="flex flex-col">
            {pendientes.map((r) => (
              <div key={r.id} className="border-t border-grafito py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <strong>{r.usuario}</strong>
                      <span className="rounded-sm bg-grafito px-[6px] py-[1px] text-[11px] font-bold text-plata">{etiqueta(OBJETIVOS, r.objetivo).toUpperCase()}</span>
                      <span className="font-metrica text-[12px] text-niebla">{dia(r.creada_en)} {horaCorta(r.creada_en)} · origen {r.origen}</span>
                    </div>
                    <div className="text-[13px] text-niebla">{r.nombre} · {r.semanas} semanas</div>
                  </div>
                  <div className="flex flex-none gap-2">
                    <Boton chico onClick={() => { setAbierta(abierta === r.id ? null : r.id); setNota(''); }}>{abierta === r.id ? 'Cerrar' : 'Ajustar o rechazar'}</Boton>
                    <Boton chico variante="primario" disabled={ocupada === r.id} onClick={() => void revisar(r, { accion: 'APROBAR' }, 'Rutina aprobada')}>Aprobar</Boton>
                  </div>
                </div>
                {abierta === r.id && (
                  <div className="mt-3 flex animate-entrada-corta flex-col gap-2 rounded border border-grafito bg-carbon p-3">
                    <textarea value={nota} onChange={(e) => setNota(e.target.value)} rows={2} maxLength={500} aria-label="Nota del entrenador"
                      placeholder="Nota para el usuario (p. ej.: baja el peso en la sentadilla y avisa si duele la rodilla)" className="campo py-2" />
                    <div className="flex justify-end gap-2">
                      <Boton chico variante="peligro" disabled={!nota.trim() || ocupada === r.id}
                        onClick={() => void revisar(r, { accion: 'RECHAZAR', observaciones: nota.trim() }, 'Rutina rechazada')}>Rechazar</Boton>
                      <Boton chico disabled={!nota.trim() || ocupada === r.id}
                        onClick={() => void revisar(r, { accion: 'AJUSTAR', observaciones: nota.trim() }, 'Nota guardada')}>Guardar nota</Boton>
                      <Boton chico variante="claro" disabled={ocupada === r.id}
                        onClick={() => void revisar(r, { accion: 'APROBAR', observaciones: nota.trim() || undefined }, 'Rutina aprobada con nota')}>Guardar nota y aprobar</Boton>
                    </div>
                    <span className="text-[12px] text-niebla">Rechazar exige explicar el motivo. Los ejercicios no se cambian aquí: la IA y el trigger de seguridad ya los validaron.</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
