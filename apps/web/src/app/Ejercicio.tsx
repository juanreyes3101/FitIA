import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  CLASIFICACIONES_IMC, DIFICULTADES, esVerdadero, etiqueta, formatoNumero, OBJETIVOS, SEVERIDADES, TIPOS_EJERCICIO,
  type Ejercicio as TEjercicio, type Rutina,
} from '@fitia/shared';
import { api } from '../api';
import { useSesion } from '../auth/SesionContext';
import { useDatos } from '../hooks/useDatos';
import { descanso, dosis } from '../lib/rutina';
import { Boton, BotonLink } from '../ui/Boton';
import { ErrorEstado, Esqueleto } from '../ui/Estados';
import { Icono } from '../ui/Iconos';
import { rutinaActivaONula } from './Dashboard';

let catalogo: Promise<TEjercicio[]> | null = null;
/** Catálogo completo (GET /ejercicios), una vez por sesión de página. */
export const obtenerCatalogo = () =>
  (catalogo ??= api.ejercicios.listar().catch((e) => ((catalogo = null), Promise.reject(e))));

const CORTO: Record<string, string> = { CARDIO: 'CAR', CORE: 'CORE', FUERZA: 'FZA', MOVILIDAD: 'MOV', ESTIRAMIENTO: 'EST' };

/** "Paso a paso" a partir del texto de instrucciones (frases o comas largas). */
function pasos(texto: string | null | undefined): string[] {
  if (!texto) return [];
  const frases = texto.split(/(?<=\.)\s+/).filter(Boolean);
  const base = frases.length > 1 ? frases : texto.split(/,\s+/);
  return base.map((p) => p.trim().replace(/^\w/, (c) => c.toUpperCase()).replace(/[.,]?$/, '.'));
}

export function Ejercicio() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state } = useLocation() as { state?: { desde?: string } };
  const { perfil } = useSesion();
  const { datos, cargando, error, recargar } = useDatos(
    () => Promise.all([obtenerCatalogo(), rutinaActivaONula()]) as Promise<[TEjercicio[], Rutina | null]>,
    [id],
  );

  const desde = state?.desde === 'lumbar' ? 'Zona lumbar' : state?.desde === 'dashboard' ? 'Inicio' : 'Mi rutina';
  const volver = (
    <button onClick={() => navigate(-1)} className="inline-flex min-h-[44px] items-center gap-2 self-start rounded px-2 font-semibold text-niebla hover:bg-concreto hover:text-hueso">
      <Icono nombre="atras" /> {desde}
    </button>
  );

  if (cargando && !datos)
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        {volver}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Esqueleto className="h-[420px]" />
          <Esqueleto className="h-[420px]" />
        </div>
      </div>
    );
  if (error)
    return (
      <div className="flex flex-col gap-4">
        {volver}
        <ErrorEstado error={error} onReintentar={recargar} />
      </div>
    );

  const [lista, rutina] = datos!;
  const ej = lista.find((e) => e.id === Number(id));
  const enRutina = rutina?.dias.flatMap((d) => d.ejercicios.map((e) => ({ ...e, dia: d }))).find((e) => e.ejercicio_id === Number(id));

  if (!ej)
    return (
      <div className="flex flex-col gap-4">
        {volver}
        <div className="flex flex-col items-start gap-4 rounded border border-dashed border-grafito p-10">
          <span className="font-metrica text-[13px] text-niebla">ERROR 404</span>
          <h1 className="font-titulo text-[clamp(36px,4vw,56px)] uppercase leading-[.92]">No encontramos este ejercicio</h1>
          <p className="text-niebla">Puede que lo hayamos cambiado en tu nueva rutina.</p>
          <BotonLink to="/app/lumbar">Ver biblioteca de ejercicios</BotonLink>
        </div>
      </div>
    );

  const tieneLumbar = perfil?.condiciones.some((c) => c.codigo === 'DOLOR_LUMBAR');
  const lumbar = perfil?.condiciones.find((c) => c.codigo === 'DOLOR_LUMBAR');
  const seguro = esVerdadero(ej.apto_lumbar);
  const lista_pasos = pasos(ej.instrucciones ?? enRutina?.instrucciones);
  const imc = perfil?.medicion_actual.imc;
  const clase = perfil?.medicion_actual.clasificacion_imc;
  const basado = [
    imc != null && `IMC ${formatoNumero(imc, 2)}${clase ? ` (${CLASIFICACIONES_IMC[clase].toLowerCase()})` : ''}`,
    lumbar && `molestia lumbar ${etiqueta(SEVERIDADES, lumbar.severidad).toLowerCase()}`,
    perfil?.perfil && `objetivo ${etiqueta(OBJETIVOS, perfil.perfil.objetivo).toLowerCase()}`,
  ]
    .filter(Boolean)
    .join(' · ');
  const porque =
    enRutina?.notas ??
    (seguro
      ? 'Es apto para molestia lumbar: trabaja sin cargar la espalda baja. Por eso pasó los filtros de seguridad de tu rutina.'
      : 'Pasó los filtros de seguridad para tu perfil: no está contraindicado para tus condiciones. Cuida la postura en cada repetición.');

  return (
    <div className="flex animate-entrada flex-col gap-5">
      {volver}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="flex flex-col gap-4">
          <div className="duotono relative flex aspect-[4/3] items-end overflow-hidden rounded">
            <span aria-hidden className="absolute -right-2 -top-6 font-titulo text-[clamp(120px,14vw,200px)] leading-none text-asfalto/50">
              {CORTO[ej.tipo]}
            </span>
            <span className="relative m-4 inline-flex items-center gap-2 rounded-sm bg-asfalto px-3 py-2 font-metrica text-[13px] text-niebla">
              <Icono nombre="play" tam={14} /> Video de técnica · próximamente
            </span>
          </div>
          <div className="tarjeta flex flex-col gap-3 p-5">
            <span className="font-metrica text-xs tracking-[.06em] text-niebla">MÚSCULOS TRABAJADOS</span>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-sm bg-voltaje px-2.5 py-1.5 text-sm font-semibold text-asfalto">{ej.grupo}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div>
            <div className="kicker">
              {TIPOS_EJERCICIO[ej.tipo].toUpperCase()}
              {enRutina ? ` · DÍA ${enRutina.dia.dia_numero} · ${enRutina.dia.enfoque.toUpperCase()}` : ' · BIBLIOTECA'}
            </div>
            <h1 className="mt-2 font-titulo text-[clamp(40px,5vw,72px)] font-normal uppercase leading-[.9]">{ej.nombre}</h1>
            <div className="mt-3 flex flex-wrap gap-2">
              {tieneLumbar &&
                (seguro ? (
                  <span className="inline-flex items-center gap-1.5 rounded-sm bg-exito/10 px-2 py-1 etiqueta text-exito">
                    <Icono nombre="lumbar" tam={14} /> SEGURO PARA TU ESPALDA
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-sm bg-advertencia/10 px-2 py-1 etiqueta text-advertencia">
                    <Icono nombre="alerta" tam={14} /> CUIDA LA POSTURA
                  </span>
                ))}
              <span className="rounded-sm border border-grafito px-2 py-1 etiqueta text-niebla">{DIFICULTADES[ej.dificultad].toUpperCase()}</span>
              <span className="rounded-sm border border-grafito px-2 py-1 etiqueta text-niebla">IMPACTO {ej.impacto}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-px overflow-hidden rounded border border-grafito bg-grafito">
            {[
              [enRutina ? dosis(enRutina) : '—', enRutina?.repeticiones ? 'SERIES × REPS' : 'DOSIS'],
              [enRutina ? descanso(enRutina) : '—', 'DESCANSO'],
              [ej.equipo, 'EQUIPO'],
            ].map(([v, l]) => (
              <div key={l} className="flex flex-col gap-1 bg-concreto p-4">
                <span className="cifra text-lg font-bold">{v}</span>
                <span className="text-[11px] font-bold tracking-[.08em] text-niebla">{l}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2 rounded border border-voltaje/40 bg-voltaje/5 p-5">
            <h2 className="font-titulo text-2xl uppercase leading-none">Por qué lo elegimos para ti</h2>
            <p>{porque}</p>
            {basado && <p className="font-metrica text-xs text-niebla">Basado en: {basado}</p>}
          </div>

          {lista_pasos.length > 0 && (
            <div className="flex flex-col gap-3">
              <h2 className="font-titulo text-2xl uppercase leading-none">Paso a paso</h2>
              <ol className="m-0 flex list-none flex-col gap-2 p-0">
                {lista_pasos.map((t, i) => (
                  <li key={i} className="flex gap-4 border-t border-grafito pt-3">
                    <span className="font-metrica text-sm font-bold text-voltaje">0{i + 1}</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            {enRutina && (
              <BotonLink to="/app/entreno" state={{ dia: enRutina.dia.rutina_dia_id }}>
                <Icono nombre="entreno" /> Entrenar ahora
              </BotonLink>
            )}
            <Boton variante="secundario" onClick={() => navigate('/app/lumbar')}>
              Más ejercicios lumbares
            </Boton>
          </div>
        </div>
      </div>
    </div>
  );
}
