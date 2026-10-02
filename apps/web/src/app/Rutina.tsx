import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ACTIVIDADES, ApiError, etiqueta, OBJETIVOS, SEVERIDADES, TIPOS_EJERCICIO, type Rutina as TRutina, type RutinaGenerada,
} from '@fitia/shared';
import { api } from '../api';
import { useSesion } from '../auth/SesionContext';
import { useDatos } from '../hooks/useDatos';
import { descanso, dosis, fechaCorta, minutosDia, sesionesEstaSemana } from '../lib/rutina';
import { Boton, BotonLink } from '../ui/Boton';
import { Aviso, ErrorEstado, Esqueleto, mensajeError, Vacio } from '../ui/Estados';
import { Icono } from '../ui/Iconos';
import { rutinaActivaONula, textoCupo } from './Dashboard';

const PASOS_GEN = [
  'Leyendo tu perfil y tus molestias',
  'Quitando ejercicios contraindicados',
  'Ajustando a tus días y minutos',
  'Revisando que todo sea seguro para ti',
];

type Aviso_ = { tipo: 'nueva' | 'base' | 'cache' | 'sinCupo' | 'error'; texto?: string } | null;

export function Rutina() {
  const { perfil, recargarPerfil } = useSesion();
  const { datos, cargando, error, recargar, setDatos } = useDatos(() =>
    Promise.all([rutinaActivaONula(), api.progreso(14)]).then(([r, p]) => ({ rutina: r, hechas: sesionesEstaSemana(p.adherencia_semanal) })),
  );
  const [dia, setDia] = useState<number | null>(null);
  const [generando, setGenerando] = useState(false);
  const [paso, setPaso] = useState(0);
  const [aviso, setAviso] = useState<Aviso_>(null);
  const timer = useRef<number>();
  useEffect(() => () => window.clearInterval(timer.current), []);

  const cupo = perfil?.cupo_ia_restante ?? 0;
  const lumbar = perfil?.condiciones.find((c) => c.codigo === 'DOLOR_LUMBAR');

  async function generar() {
    setGenerando(true);
    setAviso(null);
    setPaso(0);
    const t0 = Date.now();
    timer.current = window.setInterval(() => setPaso((s) => Math.min(s + 1, 3)), 800);
    try {
      const r: RutinaGenerada = await api.rutinas.generar();
      await new Promise((res) => setTimeout(res, Math.max(0, 3200 - (Date.now() - t0))));
      setDatos({ rutina: r, hechas: datos?.hechas ?? 0 });
      setDia(0);
      setAviso(
        r.desde_cache
          ? { tipo: 'cache', texto: 'Tu perfil no cambió desde la última rutina, así que te mostramos la misma. No gastaste cupo.' }
          : r.proveedor === 'mock'
            ? { tipo: 'base', texto: r.explicacion }
            : { tipo: 'nueva', texto: r.explicacion },
      );
    } catch (e) {
      if (e instanceof ApiError && e.codigo === 'CUPO_IA_AGOTADO') setAviso({ tipo: 'sinCupo', texto: e.message });
      else setAviso({ tipo: 'error', texto: mensajeError(e) });
    } finally {
      window.clearInterval(timer.current);
      setGenerando(false);
      recargarPerfil();
    }
  }

  const botonGenerar = (texto: string) => (
    <Boton onClick={generar} disabled={cupo <= 0} cargando={generando}>
      <Icono nombre="ia" /> {texto}
    </Boton>
  );

  if (generando)
    return (
      <div className="flex min-h-[60vh] animate-entrada flex-col justify-center gap-6">
        <span className="flex h-[72px] w-[72px] -rotate-[7deg] items-center justify-center rounded bg-voltaje text-asfalto">
          <Icono nombre="ia" tam={36} className="animate-pulso" />
        </span>
        <h1 className="font-titulo text-[clamp(40px,5vw,72px)] font-normal uppercase leading-[.9]">La IA está armando tu rutina…</h1>
        <div className="h-2.5 max-w-[600px] overflow-hidden bg-concreto">
          <div className="h-full bg-voltaje transition-[width] duration-arranque ease-fitia" style={{ width: `${((paso + 1) / 4) * 100}%` }} />
        </div>
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {PASOS_GEN.map((t, i) => (
            <li key={t} className={`flex items-center gap-3 text-[17px] ${i < paso ? 'text-hueso' : i === paso ? 'text-voltaje' : 'text-humo'}`}>
              {i < paso ? <Icono nombre="check" className="text-voltaje" /> : <span className={`mx-1.5 h-2.5 w-2.5 ${i === paso ? 'animate-pulso bg-voltaje' : 'bg-grafito'}`} />}
              {t}
            </li>
          ))}
        </ul>
      </div>
    );

  if (cargando && !datos)
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <Esqueleto className="h-24 max-w-[520px]" />
        <Esqueleto className="h-20" />
        <Esqueleto className="h-[420px]" />
      </div>
    );
  if (error) return <ErrorEstado error={error} onReintentar={recargar} />;

  const rutina: TRutina | null = datos!.rutina;
  if (!rutina)
    return (
      <div className="flex flex-col gap-4">
        <Vacio
          titulo="Tu semana está en blanco"
          texto="Genera tu rutina y la verás aquí, día por día."
          accion={perfil?.perfil ? botonGenerar('Generar mi rutina con IA') : <BotonLink to="/app/onboarding">Cuéntanos de ti</BotonLink>}
        />
        {aviso && <AvisoRutina aviso={aviso} />}
      </div>
    );

  const hechas = datos!.hechas % Math.max(1, rutina.dias.length);
  const idxHoy = hechas;
  const sel = dia ?? idxHoy;
  const d = rutina.dias[sel];
  const p = perfil?.perfil;
  const seguros = d?.ejercicios.filter((e) => e.apto_lumbar).length ?? 0;
  const origen = rutina.origen === 'ENTRENADOR' ? 'AJUSTADA POR TU ENTRENADOR' : `GENERADA ${rutina.estado === 'ACTIVA' ? 'Y APROBADA' : ''} · ${fechaCorta(rutina.creada_en).toUpperCase()}`;

  return (
    <div className="flex animate-entrada flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div className="flex flex-col gap-3">
          <div className="kicker">MI RUTINA · {origen.replace(/\s+/g, ' ')}</div>
          <h1 className="font-titulo text-[clamp(40px,5vw,72px)] font-normal uppercase leading-[.9]">
            {rutina.dias.length} días.
            <br />
            <span className="text-voltaje">{p?.minutos_por_sesion ?? minutosDia(rutina.dias[0])} minutos.</span>
          </h1>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-sm bg-grafito px-2.5 py-1.5 etiqueta">{etiqueta(OBJETIVOS, rutina.objetivo).toUpperCase()}</span>
            {lumbar && (
              <span className="rounded-sm bg-exito/10 px-2.5 py-1.5 etiqueta text-exito">
                LUMBAR · {etiqueta(SEVERIDADES, lumbar.severidad).toUpperCase()}
              </span>
            )}
            {p && <span className="rounded-sm border border-grafito px-2.5 py-1.5 etiqueta text-niebla">{etiqueta(ACTIVIDADES, p.nivel_actividad).toUpperCase()}</span>}
            <span className="rounded-sm border border-grafito px-2.5 py-1.5 etiqueta text-niebla">{rutina.semanas} SEMANAS</span>
          </div>
        </div>
        <div className="flex flex-col items-start gap-2 md:items-end">
          {botonGenerar('Generar nueva rutina con IA')}
          <span className="font-metrica text-[13px] text-niebla">{textoCupo(cupo)}</span>
        </div>
      </header>

      {cupo <= 0 && !aviso && (
        <Aviso tono="advertencia" titulo="Ya usaste tus rutinas IA de este mes." accion={<Link to="/app/planes" className="font-semibold">Pásate a Pro →</Link>}>
          Se recargan el 1 del próximo mes. Mientras tanto, sigue con esta rutina: está validada para ti.
        </Aviso>
      )}
      {aviso && <AvisoRutina aviso={aviso} />}
      {!aviso && rutina.observaciones_validacion && (
        <Aviso tono="ia" titulo="Por qué esta rutina:">
          {rutina.observaciones_validacion}
        </Aviso>
      )}

      <nav aria-label="Días de la rutina" className="grid grid-cols-1 gap-2" style={{ gridTemplateColumns: `repeat(${rutina.dias.length}, minmax(0,1fr))` }}>
        {rutina.dias.map((x, i) => {
          const on = i === sel;
          const estado = i < hechas ? 'HECHO' : i === idxHoy ? 'HOY' : 'PRÓXIMO';
          return (
            <button
              key={x.rutina_dia_id}
              onClick={() => setDia(i)}
              aria-pressed={on}
              className={`relative flex min-h-[96px] flex-col items-start justify-between gap-2 overflow-hidden rounded border-2 p-3 text-left transition-colors ${
                on ? 'border-voltaje bg-voltaje text-asfalto' : 'border-grafito bg-concreto hover:border-niebla'
              }`}
            >
              <span aria-hidden className={`absolute -bottom-3 right-1 font-titulo text-[64px] leading-none ${on ? 'text-asfalto/15' : 'text-grafito'}`}>
                0{x.dia_numero}
              </span>
              <span className="font-metrica text-xs font-bold">DÍA {x.dia_numero}</span>
              <span className="relative line-clamp-2 text-sm font-semibold">{x.enfoque}</span>
              <span className={`relative etiqueta ${on ? '' : estado === 'HECHO' ? 'text-exito' : estado === 'HOY' ? 'text-voltaje' : 'text-niebla'}`}>{estado}</span>
            </button>
          );
        })}
      </nav>

      {d && (
        <section className="tarjeta flex flex-col gap-5 p-[clamp(20px,3vw,32px)]">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="font-metrica text-[13px] text-niebla">DÍA {d.dia_numero}</div>
              <h2 className="mt-1 font-titulo text-[clamp(32px,3.6vw,48px)] font-normal uppercase leading-[.92]">{d.enfoque}</h2>
              <div className="mt-2 font-metrica text-sm text-niebla">
                ≈ {minutosDia(d)} MIN · {d.ejercicios.length} EJERCICIOS
                {lumbar && ` · ${seguros} SEGUROS PARA TU ESPALDA`}
              </div>
            </div>
            <BotonLink to="/app/entreno" state={{ dia: d.rutina_dia_id }}>
              <Icono nombre="entreno" /> Empezar entreno
            </BotonLink>
          </div>
          <ol className="m-0 flex list-none flex-col p-0">
            {d.ejercicios.map((e, i) => (
              <li key={e.rutina_ejercicio_id} className="border-t border-grafito">
                <Link
                  to={`/app/ejercicio/${e.ejercicio_id}`}
                  state={{ desde: 'rutina' }}
                  className="group flex items-center gap-4 py-4 text-hueso no-underline hover:text-hueso"
                >
                  <span className="w-10 flex-none font-titulo text-[32px] leading-none text-grafito group-hover:text-voltaje">{String(i + 1).padStart(2, '0')}</span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="text-[17px] font-bold">{e.nombre}</span>
                    <span className="flex flex-wrap gap-x-4 gap-y-1 font-metrica text-[13px] text-niebla">
                      <span className="font-bold text-hueso">{dosis(e)}</span>
                      <span>Descanso {descanso(e)}</span>
                      <span>{TIPOS_EJERCICIO[e.tipo]}</span>
                    </span>
                    {e.notas && <span className="text-sm text-niebla">{e.notas}</span>}
                  </span>
                  {lumbar &&
                    (e.apto_lumbar ? (
                      <span className="hidden flex-none items-center gap-1.5 rounded-sm bg-exito/10 px-2 py-1 text-[11px] font-bold tracking-[.08em] text-exito sm:inline-flex">
                        <Icono nombre="lumbar" tam={14} /> SEGURO PARA TU ESPALDA
                      </span>
                    ) : (
                      <span className="hidden flex-none items-center gap-1.5 rounded-sm bg-advertencia/10 px-2 py-1 text-[11px] font-bold tracking-[.08em] text-advertencia sm:inline-flex">
                        <Icono nombre="alerta" tam={14} /> CUIDA LA POSTURA
                      </span>
                    ))}
                  <Icono nombre="flecha" className="flex-none text-niebla group-hover:text-voltaje" />
                </Link>
              </li>
            ))}
          </ol>
          <p className="text-sm text-niebla">Toca un ejercicio para ver la técnica y por qué lo elegimos para ti.</p>
        </section>
      )}
    </div>
  );
}

function AvisoRutina({ aviso }: { aviso: NonNullable<Aviso_> }) {
  switch (aviso.tipo) {
    case 'nueva':
      return <Aviso tono="ia" titulo="Rutina nueva lista.">{aviso.texto}</Aviso>;
    case 'base':
      return (
        <Aviso tono="advertencia" titulo="Rutina base segura.">
          La armamos con reglas de seguridad, sin el modelo de IA. {aviso.texto}
        </Aviso>
      );
    case 'cache':
      return <Aviso tono="info" titulo="Misma rutina.">{aviso.texto}</Aviso>;
    case 'sinCupo':
      return (
        <Aviso tono="advertencia" titulo="Sin cupo." accion={<Link to="/app/planes" className="font-semibold">Pásate a Pro →</Link>}>
          {aviso.texto}
        </Aviso>
      );
    default:
      return <Aviso tono="error">{aviso.texto}</Aviso>;
  }
}
