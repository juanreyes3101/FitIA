import { useMemo, useState, type FormEvent } from 'react';
import {
  DIFICULTADES, TIPOS_EJERCICIO, esVerdadero, type CondicionCatalogo, type Contraindicacion, type Dificultad,
  type EjercicioAdmin, type EjercicioAdminEntrada, type Impacto, type TipoEjercicio,
} from '@fitia/shared';
import { admin } from '../api';
import { useDatos } from '../hooks/useDatos';
import { Boton } from '../ui/Boton';
import { Dialogo } from '../ui/Dialogo';
import { Cargando, ErrorEstado, mensajeError } from '../ui/Estados';
import { useToast } from '../ui/Toasts';

const CORTO: Record<TipoEjercicio, string> = { FUERZA: 'FZA', CARDIO: 'CAR', ESTIRAMIENTO: 'EST', MOVILIDAD: 'MOV', CORE: 'CORE' };
const IMPACTOS: Impacto[] = ['BAJO', 'MEDIO', 'ALTO'];

async function cargar() {
  const [ejercicios, catalogo, condiciones, contra] = await Promise.all([
    admin.ejercicios.listar(), admin.ejercicios.catalogo(), admin.condiciones(), admin.contraindicaciones.listar(),
  ]);
  // Nombres de grupo y equipo: la tabla admin trae los ids y el catálogo los nombres
  const grupos = new Map<number, string>();
  const equipos = new Map<number, string>();
  for (const e of ejercicios) {
    const c = catalogo.find((x) => x.id === e.id);
    if (c) {
      grupos.set(e.grupo_muscular_id, c.grupo);
      equipos.set(e.equipamiento_id, c.equipo);
    }
  }
  return { ejercicios, condiciones, contra, grupos, equipos };
}

type Celda = { ejercicio: EjercicioAdmin; condicion: CondicionCatalogo; fila?: Contraindicacion };

export default function Ejercicios() {
  const avisar = useToast();
  const { datos, cargando, error, recargar, setDatos } = useDatos(cargar, []);
  const [q, setQ] = useState('');
  const [editando, setEditando] = useState<EjercicioAdmin | 'nuevo' | null>(null);
  const [celda, setCelda] = useState<Celda | null>(null);
  const [borrar, setBorrar] = useState<EjercicioAdmin | null>(null);

  const lista = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (datos?.ejercicios ?? []).filter((e) => !t || e.nombre.toLowerCase().includes(t));
  }, [datos, q]);
  const mapa = useMemo(() => new Map((datos?.contra ?? []).map((c) => [`${c.ejercicio_id}-${c.condicion_id}`, c])), [datos]);

  async function quitarEjercicio(e: EjercicioAdmin) {
    try {
      await admin.ejercicios.borrar(e.id);
      setDatos({ ...datos!, ejercicios: datos!.ejercicios.filter((x) => x.id !== e.id), contra: datos!.contra.filter((c) => c.ejercicio_id !== e.id) });
      avisar('warn', 'Ejercicio eliminado', e.nombre);
    } catch (err) {
      avisar('err', 'No se pudo eliminar', mensajeError(err));
    }
    setBorrar(null);
  }

  return (
    <div className="flex animate-entrada flex-col gap-3">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="kicker">{datos ? `${datos.ejercicios.length} EJERCICIOS · ${datos.contra.length} CONTRAINDICACIONES · ${datos.condiciones.length} CONDICIONES` : 'CATÁLOGO'}</div>
          <h1 className="titulo-pagina">Ejercicios y contraindicaciones</h1>
        </div>
        <Boton variante="primario" onClick={() => setEditando('nuevo')} disabled={!datos}>+ Nuevo ejercicio</Boton>
      </header>

      {cargando && !datos ? <Cargando /> : error || !datos ? <ErrorEstado error={error} reintentar={recargar} /> : (
        <div className="grid grid-cols-[minmax(260px,.8fr)_minmax(0,2fr)] items-start gap-[10px]">
          <div className="flex max-h-[calc(100vh-210px)] flex-col rounded border border-grafito bg-concreto">
            <div className="border-b border-grafito p-[10px]">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar ejercicio" aria-label="Buscar ejercicio" className="campo" />
            </div>
            <div className="overflow-auto">
              {lista.map((e) => (
                <div key={e.id} className="flex items-center gap-2 border-b border-grafito px-[10px] py-[7px] hover:bg-fila">
                  <span className="w-[38px] text-[10px] font-bold text-niebla">{CORTO[e.tipo]}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold" title={e.nombre}>{e.nombre}</span>
                    <span className="font-metrica text-[11px] text-niebla">
                      {DIFICULTADES[e.dificultad]} · impacto {e.impacto.toLowerCase()}{esVerdadero(e.apto_lumbar) ? ' · ✓ espalda' : ''}
                    </span>
                  </span>
                  <button type="button" onClick={() => setEditando(e)} aria-label={`Editar ${e.nombre}`} className="h-7 w-7 rounded-sm text-niebla hover:bg-grafito hover:text-hueso">✎</button>
                  <button type="button" onClick={() => setBorrar(e)} aria-label={`Eliminar ${e.nombre}`} className="h-7 w-7 rounded-sm text-niebla hover:bg-error/15 hover:text-error">✕</button>
                </div>
              ))}
              {!lista.length && <p className="p-4 text-center text-[13px] text-niebla">Ningún ejercicio coincide.</p>}
            </div>
          </div>

          <div className="panel flex min-w-0 flex-col gap-[10px] p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="titulo-panel">MATRIZ EJERCICIO × CONDICIÓN</span>
              <div className="flex gap-3 text-[12px] text-niebla">
                <span className="flex items-center gap-[6px]"><span className="h-[14px] w-[14px] border border-grafito bg-carbon" />Apto</span>
                <span className="flex items-center gap-[6px]"><span className="h-[14px] w-[14px] bg-senal" />Contraindicado</span>
                <span>· clic para cambiar</span>
              </div>
            </div>
            <div className="max-h-[calc(100vh-260px)] overflow-auto">
              <table className="min-w-[640px]">
                <thead>
                  <tr className="sticky top-0 z-[1] bg-concreto">
                    <th className="etiqueta px-2 py-[6px] text-left">EJERCICIO</th>
                    {datos.condiciones.map((c) => (
                      <th key={c.id} title={c.descripcion ?? c.nombre} className="etiqueta whitespace-nowrap px-1 py-[6px] text-center">{c.nombre.toUpperCase()}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lista.map((e) => (
                    <tr key={e.id} className="border-t border-rejilla">
                      <td className="whitespace-nowrap px-2 py-[3px] text-[13px]">{e.nombre}</td>
                      {datos.condiciones.map((c) => {
                        const fila = mapa.get(`${e.id}-${c.id}`);
                        const etiqueta = `${e.nombre} · ${c.nombre}: ${fila ? `contraindicado (${fila.motivo})` : 'apto'}`;
                        return (
                          <td key={c.id} className="p-[2px]">
                            <button type="button" onClick={() => setCelda({ ejercicio: e, condicion: c, fila })} aria-label={etiqueta} title={etiqueta}
                              className={`h-7 w-full min-w-[64px] rounded-sm border text-[11px] font-bold transition-colors hover:outline hover:outline-1 hover:outline-hueso ${
                                fila ? 'border-senal bg-senal text-asfalto' : 'border-grafito bg-carbon text-tenue'}`}>
                              {fila ? 'NO' : 'APTO'}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <span className="text-[12px] text-niebla">
              La IA nunca recibe un ejercicio contraindicado para las condiciones del usuario: esta tabla alimenta el catálogo seguro, el validador y el trigger de la base de datos.
            </span>
          </div>
        </div>
      )}

      {datos && editando && (
        <FormEjercicio ejercicio={editando === 'nuevo' ? null : editando} grupos={datos.grupos} equipos={datos.equipos}
          alCerrar={() => setEditando(null)} alGuardar={(e, nuevo) => {
            setDatos({ ...datos, ejercicios: nuevo ? [...datos.ejercicios, e] : datos.ejercicios.map((x) => (x.id === e.id ? e : x)) });
            avisar('ok', nuevo ? 'Ejercicio creado' : 'Cambios guardados', nuevo ? `${e.nombre} · márcalo en la matriz` : e.nombre);
          }} />
      )}
      {datos && celda && (
        <DialogoCelda celda={celda} alCerrar={() => setCelda(null)} alCambiar={(contra) => setDatos({ ...datos, contra })} contra={datos.contra} />
      )}
      <Dialogo titulo="Eliminar ejercicio" abierto={!!borrar} alCerrar={() => setBorrar(null)}>
        <p className="text-[14px]">¿Eliminar <strong>{borrar?.nombre}</strong>? Si alguna rutina lo usa, la base de datos no lo permitirá.</p>
        <div className="flex justify-end gap-2">
          <Boton variante="fantasma" onClick={() => setBorrar(null)}>Cancelar</Boton>
          <Boton variante="peligro" onClick={() => borrar && void quitarEjercicio(borrar)}>Eliminar</Boton>
        </div>
      </Dialogo>
    </div>
  );
}

function DialogoCelda({ celda, contra, alCerrar, alCambiar }: {
  celda: Celda; contra: Contraindicacion[]; alCerrar: () => void; alCambiar: (c: Contraindicacion[]) => void;
}) {
  const avisar = useToast();
  const [motivo, setMotivo] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const { ejercicio: e, condicion: c, fila } = celda;

  async function aplicar() {
    setOcupado(true);
    try {
      if (fila) {
        await admin.contraindicaciones.borrar(e.id, c.id);
        alCambiar(contra.filter((x) => !(x.ejercicio_id === e.id && x.condicion_id === c.id)));
        avisar('warn', 'Ahora es apto', `${e.nombre} para ${c.nombre.toLowerCase()}`);
      } else {
        await admin.contraindicaciones.crear({ ejercicio_id: e.id, condicion_id: c.id, motivo: motivo.trim() });
        alCambiar([...contra, { ejercicio_id: e.id, condicion_id: c.id, motivo: motivo.trim(), ejercicio: e.nombre, condicion: c.codigo }]);
        avisar('ok', 'Contraindicación guardada', `${e.nombre} · ${c.nombre}`);
      }
      alCerrar();
    } catch (err) {
      avisar('err', 'No se pudo cambiar', mensajeError(err));
    } finally {
      setOcupado(false);
    }
  }

  return (
    <Dialogo titulo={fila ? 'Quitar contraindicación' : 'Marcar como contraindicado'} abierto alCerrar={alCerrar}>
      <p className="text-[14px]"><strong>{e.nombre}</strong> × <strong>{c.nombre}</strong></p>
      {fila ? (
        <p className="text-[13px] text-niebla">Motivo actual: «{fila.motivo}». Al quitarla, la IA podrá proponer este ejercicio a quien tenga esta condición.</p>
      ) : (
        <label className="flex flex-col gap-[6px]">
          <span className="text-[12px] font-bold">Motivo (lo verá el entrenador)</span>
          <input value={motivo} onChange={(ev) => setMotivo(ev.target.value)} maxLength={255} placeholder="p. ej. Carga axial sobre la columna" className="campo" />
        </label>
      )}
      <div className="flex justify-end gap-2">
        <Boton variante="fantasma" onClick={alCerrar}>Cancelar</Boton>
        <Boton variante={fila ? 'peligro' : 'senal'} disabled={ocupado || (!fila && !motivo.trim())} onClick={() => void aplicar()}>
          {fila ? 'Quitar' : 'Contraindicar'}
        </Boton>
      </div>
    </Dialogo>
  );
}

function FormEjercicio({ ejercicio, grupos, equipos, alCerrar, alGuardar }: {
  ejercicio: EjercicioAdmin | null; grupos: Map<number, string>; equipos: Map<number, string>;
  alCerrar: () => void; alGuardar: (e: EjercicioAdmin, nuevo: boolean) => void;
}) {
  // Solo los campos que acepta la API (rechaza campos extra como `id`)
  const [f, setF] = useState<EjercicioAdminEntrada>(() => ejercicio
    ? { nombre: ejercicio.nombre, tipo: ejercicio.tipo, dificultad: ejercicio.dificultad, impacto: ejercicio.impacto,
        apto_lumbar: esVerdadero(ejercicio.apto_lumbar), grupo_muscular_id: ejercicio.grupo_muscular_id,
        equipamiento_id: ejercicio.equipamiento_id, instrucciones: ejercicio.instrucciones,
        imagen_url: ejercicio.imagen_url, video_url: ejercicio.video_url }
    : { nombre: '', tipo: 'FUERZA', dificultad: 'PRINCIPIANTE', impacto: 'BAJO', apto_lumbar: false,
        grupo_muscular_id: [...grupos.keys()][0] ?? 1, equipamiento_id: [...equipos.keys()][0] ?? 1,
        instrucciones: '', imagen_url: null, video_url: null });
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!f.nombre.trim()) return setError('Escribe cómo se llama el ejercicio.');
    setOcupado(true);
    try {
      const datos = { ...f, nombre: f.nombre.trim(), instrucciones: f.instrucciones?.trim() || null };
      const r = ejercicio ? await admin.ejercicios.editar(ejercicio.id, datos) : await admin.ejercicios.crear(datos);
      alGuardar(r, !ejercicio);
      alCerrar();
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setOcupado(false);
    }
  }

  const select = <T extends string | number>(etiqueta: string, valor: T, opciones: [T, string][], cambiar: (v: T) => void) => (
    <label className="flex flex-col gap-[6px]">
      <span className="text-[12px] font-bold">{etiqueta}</span>
      <select value={valor} onChange={(e) => cambiar((typeof valor === 'number' ? Number(e.target.value) : e.target.value) as T)} className="campo">
        {opciones.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
  return (
    <Dialogo titulo={ejercicio ? 'Editar ejercicio' : 'Nuevo ejercicio'} abierto alCerrar={alCerrar} ancho="max-w-[560px]">
      <form onSubmit={enviar} noValidate className="flex flex-col gap-3">
        <label className="flex flex-col gap-[6px]">
          <span className="text-[12px] font-bold">Nombre</span>
          <input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} maxLength={100} className="campo" />
        </label>
        <div className="grid grid-cols-3 gap-3">
          {select<TipoEjercicio>('Tipo', f.tipo, Object.entries(TIPOS_EJERCICIO) as [TipoEjercicio, string][], (tipo) => setF({ ...f, tipo }))}
          {select<Dificultad>('Dificultad', f.dificultad, Object.entries(DIFICULTADES) as [Dificultad, string][], (dificultad) => setF({ ...f, dificultad }))}
          {select<Impacto>('Impacto', f.impacto, IMPACTOS.map((i) => [i, i.charAt(0) + i.slice(1).toLowerCase()]), (impacto) => setF({ ...f, impacto }))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {select<number>('Grupo muscular', f.grupo_muscular_id, [...grupos], (grupo_muscular_id) => setF({ ...f, grupo_muscular_id }))}
          {select<number>('Equipo', f.equipamiento_id, [...equipos], (equipamiento_id) => setF({ ...f, equipamiento_id }))}
        </div>
        <label className="flex items-center gap-2 text-[13px]">
          <input type="checkbox" checked={f.apto_lumbar} onChange={(e) => setF({ ...f, apto_lumbar: e.target.checked })} className="h-4 w-4 accent-[#D4FF00]" />
          Recomendado para molestia lumbar
        </label>
        <label className="flex flex-col gap-[6px]">
          <span className="text-[12px] font-bold">Instrucciones</span>
          <textarea value={f.instrucciones ?? ''} onChange={(e) => setF({ ...f, instrucciones: e.target.value })} rows={3} className="campo py-2" />
        </label>
        {error && <p role="alert" className="text-[13px] text-error">{error}</p>}
        <div className="flex justify-end gap-2">
          <Boton variante="fantasma" onClick={alCerrar}>Cancelar</Boton>
          <Boton variante="primario" type="submit" disabled={ocupado}>{ocupado ? 'Guardando…' : 'Guardar'}</Boton>
        </div>
      </form>
    </Dialogo>
  );
}
