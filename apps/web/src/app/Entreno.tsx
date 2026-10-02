import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { Rutina, RutinaDia, SesionRegistrada } from '@fitia/shared';
import { api } from '../api';
import { useSesion } from '../auth/SesionContext';
import { useDatos } from '../hooks/useDatos';
import { diaDeHoy, dosis, sesionesEstaSemana, tiempo } from '../lib/rutina';
import { BannerAnuncio } from '../ui/BannerAnuncio';
import { Boton, BotonLink } from '../ui/Boton';
import { Aviso, AvisoSalud, Cargando, ErrorEstado, Vacio } from '../ui/Estados';
import { Icono } from '../ui/Iconos';
import { colorDolor } from '../ui/Graficas';
import { rutinaActivaONula } from './Dashboard';

const RPE = ['', 'Muy fácil', 'Fácil', 'Fácil', 'Moderado', 'Moderado', 'Algo duro', 'Duro', 'Muy duro', 'Casi al máximo', 'Máximo'];
const DOLOR = ['Nada', 'Casi nada', 'Leve', 'Leve', 'Moderado', 'Moderado', 'Fuerte', 'Fuerte', 'Muy fuerte', 'Muy fuerte', 'Insoportable'];
const mmss = (n: number) => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;
const hhmmss = (n: number) => `${String(Math.floor(n / 3600)).padStart(2, '0')}:${mmss(n % 3600).padStart(5, '0')}`;

type Fase = 'serie' | 'descanso' | 'evaluar' | 'alerta' | 'lista';

export function Entreno() {
  const { state } = useLocation() as { state?: { dia?: number } };
  const { datos, cargando, error, recargar } = useDatos(() =>
    Promise.all([rutinaActivaONula(), api.progreso(14)]).then(([r, p]) => ({ rutina: r, hechas: sesionesEstaSemana(p.adherencia_semanal) })),
  );

  if (cargando && !datos)
    return (
      <div className="contenedor">
        <Cargando texto="Preparando tu entreno…" alto="min-h-screen" />
      </div>
    );
  if (error)
    return (
      <div className="contenedor flex min-h-screen flex-col justify-center gap-4">
        <ErrorEstado error={error} onReintentar={recargar} />
        <BotonLink to="/app" variante="fantasma">
          Ir al inicio
        </BotonLink>
      </div>
    );
  const rutina = datos!.rutina;
  if (!rutina)
    return (
      <div className="contenedor flex min-h-screen flex-col justify-center">
        <Vacio titulo="Sin rutina para entrenar" texto="Primero arma tu rutina con IA. Toma 2 minutos." accion={<BotonLink to="/app/onboarding">Arma mi rutina</BotonLink>} />
      </div>
    );
  const dia = rutina.dias.find((d) => d.rutina_dia_id === state?.dia) ?? diaDeHoy(rutina, datos!.hechas)!;
  return <Sesion rutina={rutina} dia={dia} hechasSemana={datos!.hechas} />;
}

function Sesion({ rutina, dia, hechasSemana }: { rutina: Rutina; dia: RutinaDia; hechasSemana: number }) {
  const navigate = useNavigate();
  const { perfil, recargarPerfil } = useSesion();
  const lista = dia.ejercicios;
  const [ex, setEx] = useState(0);
  const [serie, setSerie] = useState(1);
  const [fase, setFase] = useState<Fase>('serie');
  const [descansoRest, setDescansoRest] = useState(0);
  const [descansoTotal, setDescansoTotal] = useState(60);
  const [cambiaEjercicio, setCambiaEjercicio] = useState(false);
  const [t, setT] = useState(0);
  const [hechas, setHechas] = useState<Record<number, number>>({});
  const [salir, setSalir] = useState(false);
  const [rpe, setRpe] = useState<number | null>(null);
  const [dolor, setDolor] = useState<number | null>(null);
  const [intento, setIntento] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null);
  const [resultado, setResultado] = useState<SesionRegistrada | null>(null);

  const totalSeries = Object.values(hechas).reduce((a, b) => a + b, 0);
  const tieneLumbar = perfil?.condiciones.some((c) => c.codigo === 'DOLOR_LUMBAR');
  const cur = lista[ex];
  const sig = lista[ex + 1];

  // Un solo cronómetro: suma tiempo en serie y descanso, y descuenta el descanso
  useEffect(() => {
    if (fase !== 'serie' && fase !== 'descanso') return;
    const iv = window.setInterval(() => {
      setT((x) => x + 1);
      if (fase === 'descanso') setDescansoRest((r) => Math.max(0, r - 1));
    }, 1000);
    return () => window.clearInterval(iv);
  }, [fase]);

  useEffect(() => {
    if (fase === 'descanso' && descansoRest <= 0) terminarDescanso();
  }, [fase, descansoRest]);

  // Vibración corta al terminar el descanso (si el navegador la soporta)
  function terminarDescanso() {
    try {
      navigator.vibrate?.(200);
    } catch {
      /* sin vibración */
    }
    setFase('serie');
    setCambiaEjercicio(false);
  }

  function irAEjercicio(i: number) {
    if (i >= lista.length) return setFase('evaluar');
    setEx(i);
    setSerie(1);
  }

  function serieLista() {
    if (!cur) return;
    setHechas((h) => ({ ...h, [cur.ejercicio_id]: (h[cur.ejercicio_id] ?? 0) + 1 }));
    const ultimaSerie = serie >= cur.series;
    const ultimoEjercicio = ex >= lista.length - 1;
    if (ultimaSerie && ultimoEjercicio) return setFase('evaluar');
    const d = cur.descanso_seg || 0;
    if (ultimaSerie) irAEjercicio(ex + 1);
    else setSerie(serie + 1);
    if (d > 0) {
      setDescansoTotal(d);
      setDescansoRest(d);
      setCambiaEjercicio(ultimaSerie);
      setFase('descanso');
    }
  }

  async function guardar() {
    setIntento(true);
    if (rpe == null || dolor == null) return;
    setGuardando(true);
    setErrorGuardar(null);
    const completada = lista.every((e) => (hechas[e.ejercicio_id] ?? 0) >= e.series);
    try {
      const r = await api.sesiones.registrar({
        rutina_dia_id: dia.rutina_dia_id,
        duracion_min: Math.max(1, Math.round(t / 60)),
        esfuerzo_percibido: rpe,
        dolor_reportado: dolor,
        completada,
        ejercicios: lista
          .filter((e) => hechas[e.ejercicio_id])
          .map((e) => ({ ejercicio_id: e.ejercicio_id, series_hechas: hechas[e.ejercicio_id], reps_hechas: e.repeticiones })),
      });
      setResultado(r);
      setFase(r.alerta_dolor ? 'alerta' : 'lista');
      recargarPerfil();
    } catch (e) {
      setErrorGuardar((e as Error).message);
    } finally {
      setGuardando(false);
    }
  }

  // Movilidad sugerida si hay dolor alto: ejercicios suaves aptos para la espalda de la propia rutina
  const movilidad = useMemo(() => {
    const vistos = new Set<number>();
    return rutina.dias
      .flatMap((d) => d.ejercicios)
      .filter((e) => (e.tipo === 'MOVILIDAD' || e.tipo === 'ESTIRAMIENTO') && e.apto_lumbar && !vistos.has(e.ejercicio_id) && vistos.add(e.ejercicio_id))
      .slice(0, 3);
  }, [rutina]);

  const encabezado = (
    <header className="sticky top-0 z-10 border-b border-grafito bg-asfalto/95 backdrop-blur-[10px]">
      <div className="mx-auto flex max-w-[1040px] items-center justify-between gap-4 px-4 py-3 sm:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex flex-none items-center gap-1.5 rounded-sm bg-senal px-2 py-1 text-[11px] font-bold tracking-[.08em] text-asfalto">
            <span className="h-1.5 w-1.5 animate-pulso bg-asfalto" /> EN VIVO
          </span>
          <span className="truncate font-semibold">
            Día {dia.dia_numero} · {dia.enfoque}
          </span>
        </div>
        <span className="cifra text-lg font-bold">{hhmmss(t)}</span>
      </div>
      <div className="mx-auto flex max-w-[1040px] gap-1 px-4 pb-3 sm:px-8">
        {lista.map((e) => (
          <div key={e.rutina_ejercicio_id} className="h-1.5 flex-1 bg-grafito">
            <div className="h-full bg-voltaje transition-[width] duration-arranque" style={{ width: `${Math.min(1, (hechas[e.ejercicio_id] ?? 0) / e.series) * 100}%` }} />
          </div>
        ))}
      </div>
    </header>
  );

  if (fase === 'alerta' && resultado)
    return (
      <div className="min-h-screen">
        <main className="mx-auto flex max-w-[760px] animate-entrada flex-col gap-6 px-4 py-12 sm:px-8">
          <span className="self-start rounded-sm bg-senal px-2.5 py-1.5 etiqueta text-asfalto">DOLOR {dolor}/10 · CUIDÉMONOS</span>
          <h1 className="font-titulo text-[clamp(44px,6vw,88px)] uppercase leading-[.9]">
            Hoy, a bajar
            <br />
            el ritmo.
          </h1>
          <p className="text-lg">
            Gracias por contarnos. Un dolor de {dolor}/10 es una señal para frenar, no para aguantar. Guardamos tu sesión: tu
            entrenador puede ver el reporte y ajustar la carga de tu rutina.
          </p>
          {movilidad.length > 0 && (
            <div className="tarjeta flex flex-col gap-3 p-5">
              <div className="flex items-baseline justify-between">
                <span className="font-titulo text-2xl uppercase">Movilidad suave sugerida</span>
                <span className="cifra text-sm text-niebla">≈ 8 MIN</span>
              </div>
              {movilidad.map((m, i) => (
                <Link key={m.ejercicio_id} to={`/app/ejercicio/${m.ejercicio_id}`} className="flex items-center gap-4 border-t border-grafito py-3 text-hueso no-underline hover:text-voltaje">
                  <span className="font-metrica text-sm text-voltaje">0{i + 1}</span>
                  <span className="flex-1 font-semibold">{m.nombre}</span>
                  <span className="cifra text-sm text-niebla">{dosis(m)}</span>
                </Link>
              ))}
            </div>
          )}
          <AvisoSalud>Si el dolor sigue más de 48 horas, baja por la pierna o sientes hormigueo, consulta a un profesional de la salud.</AvisoSalud>
          <div className="flex flex-wrap gap-3">
            {movilidad[0] && <BotonLink to={`/app/ejercicio/${movilidad[0].ejercicio_id}`}>Empezar con {movilidad[0].nombre.toLowerCase()}</BotonLink>}
            <BotonLink to="/app" variante="secundario">
              Ir al inicio
            </BotonLink>
          </div>
        </main>
      </div>
    );

  if (fase === 'lista')
    return (
      <div className="min-h-screen">
        <main className="mx-auto flex max-w-[760px] animate-entrada flex-col gap-6 px-4 py-12 sm:px-8">
          <span className="flex h-[88px] w-[88px] -rotate-[7deg] items-center justify-center rounded bg-voltaje text-asfalto">
            <Icono nombre="check" tam={44} grosor={2.5} />
          </span>
          <h1 className="font-titulo text-[clamp(56px,8vw,120px)] uppercase leading-[.88]">¡Sesión lista!</h1>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded border border-grafito bg-grafito sm:grid-cols-4">
            {[
              [hhmmss(t).replace(/^00:/, ''), 'TIEMPO'],
              [String(totalSeries), 'SERIES'],
              [`${rpe}/10`, 'ESFUERZO'],
              [`${dolor}/10`, 'DOLOR'],
            ].map(([v, l]) => (
              <div key={l} className="flex flex-col gap-1 bg-concreto p-5">
                <span className="cifra text-[32px] font-bold leading-none text-voltaje">{v}</span>
                <span className="text-[11px] font-bold tracking-[.08em] text-niebla">{l}</span>
              </div>
            ))}
          </div>
          <p className="text-lg">
            Vas {hechasSemana + 1} de {perfil?.perfil?.dias_disponibles ?? rutina.dias.length} esta semana. ¡Así es
            {perfil?.nombre ? `, ${perfil.nombre.split(' ')[0]}` : ''}!
          </p>
          <BannerAnuncio ubicacion="FIN_SESION" />
          <div className="flex flex-wrap gap-3">
            <Boton onClick={() => navigate('/app')}>Ir al inicio</Boton>
            <Boton variante="secundario" onClick={() => navigate('/app/progreso')}>
              Ver mi progreso
            </Boton>
          </div>
        </main>
      </div>
    );

  if (fase === 'evaluar')
    return (
      <div className="min-h-screen">
        {encabezado}
        <main className="mx-auto flex max-w-[760px] animate-entrada flex-col gap-7 px-4 py-10 sm:px-8">
          <div>
            <div className="kicker">
              SESIÓN TERMINADA · {mmss(t)} · {totalSeries} SERIES
            </div>
            <h1 className="mt-2 font-titulo text-[clamp(44px,6vw,80px)] uppercase leading-[.9]">¿Cómo te fue?</h1>
          </div>
          <Escala
            titulo="Esfuerzo (RPE)"
            valor={rpe}
            texto={rpe != null ? `${rpe} · ${RPE[rpe]}` : ''}
            desde={1}
            onCambio={setRpe}
            extremos={['1 · Muy fácil', '10 · Máximo']}
            error={intento && rpe == null}
          />
          <Escala
            titulo={tieneLumbar ? 'Dolor en la espalda' : 'Dolor o molestia'}
            valor={dolor}
            texto={dolor != null ? `${dolor} · ${DOLOR[dolor]}` : ''}
            desde={0}
            onCambio={setDolor}
            extremos={['0 · Nada', '10 · Insoportable']}
            color={colorDolor}
            error={intento && dolor == null}
          />
          {intento && (rpe == null || dolor == null) && (
            <span role="alert" className="text-sm text-error">
              Elige tu esfuerzo y tu nivel de dolor para guardar.
            </span>
          )}
          {errorGuardar && <Aviso tono="error">{errorGuardar}</Aviso>}
          <Boton tam="lg" onClick={guardar} cargando={guardando} className="self-start">
            Guardar sesión
          </Boton>
        </main>
      </div>
    );

  return (
    <div className="flex min-h-screen flex-col">
      {encabezado}
      <main className="mx-auto flex w-full max-w-[1040px] flex-1 flex-col gap-6 px-4 py-8 sm:px-8">
        {fase === 'descanso' ? (
          <div className="flex flex-1 animate-entrada flex-col items-start justify-center gap-6">
            <span className="kicker">DESCANSA</span>
            <div className="cifra text-[clamp(96px,18vw,200px)] font-bold leading-[.85] tracking-[-.04em] text-voltaje">{mmss(descansoRest)}</div>
            <div className="h-2.5 w-full max-w-[600px] bg-grafito">
              <div className="h-full bg-voltaje transition-[width] duration-1000 ease-linear" style={{ width: `${(descansoRest / descansoTotal) * 100}%` }} />
            </div>
            <span className="font-metrica text-sm text-niebla">DE {mmss(descansoTotal)}</span>
            <p className="text-xl">
              Siguiente:{' '}
              <strong>
                {cur?.nombre}
                {!cambiaEjercicio && ` · serie ${serie} de ${cur?.series}`}
              </strong>
            </p>
            <div className="flex flex-wrap gap-3">
              <Boton variante="secundario" onClick={() => (setDescansoRest((r) => r + 15), setDescansoTotal((x) => x + 15))}>
                +15 s
              </Boton>
              <Boton onClick={terminarDescanso}>Saltar descanso</Boton>
            </div>
            {cambiaEjercicio && <BannerAnuncio ubicacion="ENTRE_EJERCICIOS" />}
          </div>
        ) : (
          cur && (
            <div key={`${ex}-${serie}`} className="relative flex flex-1 animate-entrada flex-col gap-6">
              <div aria-hidden className="pointer-events-none absolute -right-2 -top-8 font-titulo text-[clamp(160px,22vw,300px)] leading-none text-[#1A1A1D]">
                {String(ex + 1).padStart(2, '0')}
              </div>
              <div className="relative">
                <div className="font-metrica text-[13px] text-niebla">
                  EJERCICIO {ex + 1} DE {lista.length}
                </div>
                <h1 className="mt-2 font-titulo text-[clamp(44px,7vw,104px)] uppercase leading-[.88]">{cur.nombre}</h1>
                {tieneLumbar && cur.apto_lumbar && (
                  <span className="mt-3 inline-flex items-center gap-1.5 rounded-sm bg-exito/10 px-2 py-1 etiqueta text-exito">
                    <Icono nombre="lumbar" tam={14} /> SEGURO PARA TU ESPALDA
                  </span>
                )}
              </div>
              <div className="relative flex flex-wrap items-end gap-x-10 gap-y-4">
                <div>
                  <div className="cifra text-[clamp(72px,12vw,140px)] font-bold leading-[.85] tracking-[-.04em] text-voltaje">
                    {cur.repeticiones ?? (cur.duracion_seg ? tiempo(cur.duracion_seg) : '—')}
                  </div>
                  <div className="mt-2 text-[13px] font-bold tracking-[.08em] text-niebla">{cur.repeticiones ? 'REPETICIONES' : 'DURACIÓN'}</div>
                </div>
                <div>
                  <div className="cifra text-[48px] font-bold leading-none">
                    {serie}
                    <span className="text-niebla">/{cur.series}</span>
                  </div>
                  <div className="mt-2 text-[13px] font-bold tracking-[.08em] text-niebla">SERIE</div>
                </div>
              </div>
              <div className="relative flex gap-1.5">
                {Array.from({ length: cur.series }, (_, i) => (
                  <div key={i} className={`h-2 w-12 ${i < serie - 1 ? 'bg-voltaje' : i === serie - 1 ? 'border-2 border-voltaje' : 'bg-grafito'}`} />
                ))}
              </div>
              {(cur.notas || cur.instrucciones) && (
                <p className="relative max-w-[640px] text-lg">
                  <strong className="text-voltaje">Clave:</strong> {cur.notas ?? cur.instrucciones}
                </p>
              )}
              <div className="relative mt-auto flex flex-col gap-3 pt-4 sm:flex-row sm:flex-wrap">
                <Boton tam="lg" onClick={serieLista} className="sm:min-w-[260px]">
                  <Icono nombre="check" /> SERIE LISTA
                </Boton>
                <Boton variante="fantasma" onClick={() => irAEjercicio(ex + 1)}>
                  Saltar ejercicio
                </Boton>
                <Boton variante="fantasma" onClick={() => setSalir(true)}>
                  Terminar sesión
                </Boton>
              </div>
              {sig && <p className="relative font-metrica text-sm text-niebla">Después: {sig.nombre} · {dosis(sig)}</p>}
            </div>
          )
        )}
      </main>

      {salir && (
        <div role="dialog" aria-modal="true" aria-labelledby="salir-titulo" className="fixed inset-0 z-50 flex items-end justify-center bg-asfalto/80 p-4 sm:items-center">
          <div className="flex w-full max-w-[480px] flex-col gap-4 rounded border border-grafito bg-concreto p-6 shadow-flotante">
            <h2 id="salir-titulo" className="font-titulo text-[36px] uppercase leading-none">
              ¿Terminar el entreno?
            </h2>
            <p className="text-niebla">
              Llevas <strong className="text-hueso">{totalSeries} series</strong>. Si terminas ahora, guardamos lo que hiciste.
            </p>
            <Boton onClick={() => setSalir(false)}>Seguir entrenando</Boton>
            <Boton
              variante="secundario"
              onClick={() => {
                setSalir(false);
                setFase('evaluar');
              }}
            >
              Terminar y evaluar
            </Boton>
            <Boton variante="fantasma" onClick={() => navigate('/app')}>
              Salir sin guardar
            </Boton>
          </div>
        </div>
      )}
    </div>
  );
}

function Escala({
  titulo,
  valor,
  texto,
  desde,
  onCambio,
  extremos,
  color,
  error,
}: {
  titulo: string;
  valor: number | null;
  texto: string;
  desde: number;
  onCambio: (n: number) => void;
  extremos: [string, string];
  color?: (n: number) => string;
  error?: boolean;
}) {
  const opciones = Array.from({ length: 11 - desde }, (_, i) => i + desde);
  return (
    <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
      <legend className="mb-3 flex w-full items-baseline justify-between gap-3">
        <span className="text-lg font-bold">{titulo}</span>
        <span className="cifra text-[15px] font-bold" style={{ color: valor != null && color ? color(valor) : '#D4FF00' }}>
          {texto}
        </span>
      </legend>
      <div className={`grid gap-1 rounded ${error ? 'outline outline-2 outline-offset-4 outline-error' : ''}`} style={{ gridTemplateColumns: `repeat(${opciones.length}, minmax(0,1fr))` }}>
        {opciones.map((n) => {
          const on = valor === n;
          const c = color ? color(n) : '#D4FF00';
          return (
            <button
              key={n}
              type="button"
              aria-pressed={on}
              aria-label={`${titulo}: ${n}`}
              onClick={() => onCambio(n)}
              className="min-h-[52px] rounded-sm border-2 font-metrica text-base font-bold transition-colors"
              style={on ? { background: c, borderColor: c, color: '#0B0B0C' } : { borderColor: '#2A2A2E' }}
            >
              {n}
            </button>
          );
        })}
      </div>
      <div className="flex justify-between font-metrica text-xs text-niebla">
        <span>{extremos[0]}</span>
        <span>{extremos[1]}</span>
      </div>
    </fieldset>
  );
}
