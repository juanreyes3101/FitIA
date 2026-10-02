import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError, CLASIFICACIONES_IMC, clasificarImc, esVerdadero, formatoNumero, type Progreso, type Rutina } from '@fitia/shared';
import { api } from '../api';
import { useSesion } from '../auth/SesionContext';
import { useDatos } from '../hooks/useDatos';
import { diaDeHoy, fechaCorta, hoyLargo, minutosDia, racha, semanaIso, sesionesEstaSemana, seriesDia } from '../lib/rutina';
import { BannerAnuncio } from '../ui/BannerAnuncio';
import { Boton, BotonLink } from '../ui/Boton';
import { ErrorEstado, Esqueleto } from '../ui/Estados';
import { GraficaLinea, etiquetaSemana } from '../ui/Graficas';
import { Icono } from '../ui/Iconos';
import { COLOR_IMC, MedidorImc } from '../ui/MedidorImc';

/** Rutina activa o null si el usuario todavía no tiene (404 SIN_RUTINA no es un error). */
export async function rutinaActivaONula(): Promise<Rutina | null> {
  try {
    return await api.rutinas.activa();
  } catch (e) {
    if (e instanceof ApiError && e.codigo === 'SIN_RUTINA') return null;
    throw e;
  }
}

export function textoCupo(cupo: number) {
  return cupo <= 0 ? 'Ya usaste tus rutinas IA de este mes' : cupo === 1 ? 'Te queda 1 rutina IA este mes' : `Te quedan ${cupo} rutinas IA este mes`;
}

export function Dashboard() {
  const { perfil, recargarPerfil } = useSesion();
  const navigate = useNavigate();
  useEffect(() => {
    recargarPerfil();
  }, [recargarPerfil]);

  const { datos, cargando, error, recargar } = useDatos(
    () => Promise.all([rutinaActivaONula(), api.progreso(90)]) as Promise<[Rutina | null, Progreso]>,
  );

  // Sin perfil de salud todavía → al onboarding
  useEffect(() => {
    if (perfil && !perfil.perfil) navigate('/app/onboarding', { replace: true });
  }, [perfil, navigate]);

  const nombre = perfil?.nombre?.split(' ')[0] ?? '';
  const cupo = perfil?.cupo_ia_restante ?? 0;
  const meta = perfil?.perfil?.dias_disponibles ?? 3;
  const tieneLumbar = perfil?.condiciones.some((c) => c.codigo === 'DOLOR_LUMBAR');

  const encabezado = (titular: string) => (
    <header className="flex flex-wrap items-end justify-between gap-4 pb-2">
      <div>
        <div className="kicker">
          {hoyLargo()} · SEMANA {String(semanaIso()).slice(4)}
        </div>
        <h1 className="mt-2 font-titulo text-[clamp(40px,5vw,72px)] font-normal uppercase leading-[.9]">
          Hola, {nombre}.
          <br />
          <span className="text-voltaje">{titular}</span>
        </h1>
      </div>
      <Link
        to="/app/planes"
        className={`inline-flex min-h-[44px] items-center gap-2.5 rounded border px-3.5 text-sm font-semibold text-hueso no-underline hover:bg-concreto hover:text-hueso ${
          cupo > 0 ? 'border-grafito' : 'border-advertencia'
        }`}
      >
        <Icono nombre="ia" tam={18} className="text-voltaje" />
        {textoCupo(cupo)}
      </Link>
    </header>
  );

  if (cargando && !datos)
    return (
      <div className="flex animate-entrada flex-col gap-4" aria-busy="true" aria-label="Cargando tu inicio">
        {encabezado('Vamos con todo.')}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Esqueleto className="h-[320px]" />
          <Esqueleto className="h-[320px]" />
          <Esqueleto className="h-[260px]" />
          <Esqueleto className="h-[260px]" />
        </div>
        <span className="font-metrica text-[13px] text-niebla">Cargando tu semana…</span>
      </div>
    );

  if (error)
    return (
      <div className="flex flex-col gap-4">
        {encabezado('Vamos con todo.')}
        <ErrorEstado error={error} onReintentar={recargar} />
      </div>
    );

  const [rutina, progreso] = datos!;
  const adh = progreso.adherencia_semanal;
  const hechasSemana = sesionesEstaSemana(adh);
  const semanas = racha(adh);
  const corporal = progreso.corporal.filter((c) => Date.now() - new Date(c.fecha).getTime() <= 61 * 86400000);
  const imc = perfil?.medicion_actual.imc ?? null;
  const clase = imc != null ? clasificarImc(imc) : null;
  const imcInicial = progreso.corporal[0]?.imc;
  const difImc = imc != null && imcInicial != null ? imc - imcInicial : 0;
  const pesoIni = corporal[0]?.peso_kg;
  const pesoFin = corporal[corporal.length - 1]?.peso_kg;
  const difPeso = pesoIni != null && pesoFin != null ? pesoFin - pesoIni : 0;

  if (!rutina)
    return (
      <div className="flex animate-entrada flex-col gap-4">
        {encabezado('Todo empieza hoy.')}
        <div className="relative flex min-h-[360px] flex-col items-start justify-end gap-4 overflow-hidden rounded border border-grafito bg-concreto p-[clamp(24px,4vw,48px)]">
          <div aria-hidden className="pointer-events-none absolute -right-4 -top-12 font-titulo text-[clamp(200px,24vw,320px)] leading-none text-transparent" style={{ WebkitTextStroke: '2px #2A2A2E' }}>
            00
          </div>
          <span className="relative flex h-14 w-14 items-center justify-center rounded border-2 border-voltaje text-voltaje">
            <Icono nombre="ia" tam={28} />
          </span>
          <h2 className="relative font-titulo text-[clamp(36px,4vw,56px)] font-normal uppercase leading-[.92]">
            Aún no tienes
            <br />
            rutina
          </h2>
          <p className="relative max-w-[420px] text-[17px] text-niebla">
            Cuéntanos de ti en 2 minutos y la IA arma tu primera rutina{tieneLumbar ? ', cuidando tu espalda' : ''}.
          </p>
          <BotonLink to="/app/onboarding" className="relative">
            Arma mi rutina <Icono nombre="flecha" />
          </BotonLink>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2.5 rounded border border-dashed border-grafito bg-concreto p-6">
            <span className="font-metrica text-xs tracking-[.06em] text-niebla">PESO</span>
            <div className="font-titulo text-2xl uppercase">Tu gráfica aparece aquí</div>
            <p className="text-sm text-niebla">Registra tu peso una vez por semana y mira cómo cambia.</p>
          </div>
          <div className="flex flex-col gap-2.5 rounded border border-dashed border-grafito bg-concreto p-6">
            <span className="font-metrica text-xs tracking-[.06em] text-niebla">RACHA</span>
            <div className="font-titulo text-2xl uppercase">0 semanas · todo empieza hoy</div>
            <p className="text-sm text-niebla">Cada semana con 2 sesiones o más suma a tu racha.</p>
          </div>
        </div>
        <BannerAnuncio />
      </div>
    );

  const hoy = diaDeHoy(rutina, hechasSemana);
  const semanaCumplida = hechasSemana >= meta;
  const titular = semanaCumplida ? 'Semana cumplida.' : hechasSemana > 0 ? '¡Dale, que vas bien!' : 'Hoy arrancamos.';
  const lumbarHoy = hoy?.ejercicios.some((e) => e.apto_lumbar);
  const ultimas = adh.slice(-8);

  return (
    <div className="flex animate-entrada flex-col gap-4">
      {encabezado(titular)}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {hoy && (
          <article className="relative flex min-h-[340px] flex-col gap-5 overflow-hidden rounded border border-grafito bg-concreto p-[clamp(20px,3vw,32px)]">
            <div aria-hidden className="pointer-events-none absolute -right-3 -top-10 font-titulo text-[clamp(180px,20vw,260px)] leading-none text-[#232327]">
              0{hoy.dia_numero}
            </div>
            <div className="relative flex flex-wrap items-center gap-2">
              <span className="rounded-sm bg-voltaje px-2.5 py-1.5 etiqueta text-asfalto">{semanaCumplida ? 'PRÓXIMO ENTRENO' : 'ENTRENO DE HOY'}</span>
              {tieneLumbar && lumbarHoy && (
                <span className="inline-flex items-center gap-1.5 rounded-sm bg-exito/10 px-2 py-1 etiqueta text-exito">
                  <Icono nombre="lumbar" tam={14} /> CUIDA TU ESPALDA
                </span>
              )}
            </div>
            <div className="relative">
              <h2 className="font-titulo text-[clamp(36px,4vw,56px)] font-normal uppercase leading-[.92]">
                Día {hoy.dia_numero} · {hoy.enfoque}
              </h2>
              <div className="mt-2.5 flex flex-wrap gap-4 font-metrica text-sm text-niebla">
                <span>
                  <strong className="text-hueso">{minutosDia(hoy)}</strong> MIN
                </span>
                <span>
                  <strong className="text-hueso">{hoy.ejercicios.length}</strong> EJERCICIOS
                </span>
                <span>
                  <strong className="text-hueso">{seriesDia(hoy)}</strong> SERIES
                </span>
              </div>
            </div>
            <ol className="relative m-0 flex list-none flex-wrap gap-2 p-0">
              {hoy.ejercicios.map((e, i) => (
                <li key={e.rutina_ejercicio_id}>
                  <Link
                    to={`/app/ejercicio/${e.ejercicio_id}`}
                    state={{ desde: 'dashboard' }}
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-sm border border-grafito bg-asfalto px-3 text-sm font-semibold text-hueso no-underline hover:border-voltaje hover:text-hueso"
                  >
                    <span className="font-metrica text-xs text-voltaje">{String(i + 1).padStart(2, '0')}</span>
                    {e.nombre}
                  </Link>
                </li>
              ))}
            </ol>
            <div className="relative mt-auto flex flex-wrap gap-3">
              <BotonLink to="/app/entreno" state={{ dia: hoy.rutina_dia_id }} tam="lg">
                <Icono nombre="entreno" /> Empezar entreno
              </BotonLink>
              <BotonLink to="/app/rutina" variante="secundario" tam="lg">
                Ver rutina
              </BotonLink>
            </div>
          </article>
        )}

        <div className="tarjeta flex flex-col gap-4 p-6">
          <div className="font-metrica text-xs tracking-[.06em] text-niebla">RACHA SEMANAL</div>
          <div className="flex items-baseline gap-3">
            <span className="cifra text-[72px] font-bold leading-[.9] tracking-[-.04em] text-voltaje">{semanas}</span>
            <span className="font-titulo text-2xl uppercase leading-none">
              {semanas === 1 ? 'semana' : 'semanas'}
              <br />
              seguidas
            </span>
          </div>
          <div>
            <div className="mb-2 font-metrica text-xs text-niebla">ESTA SEMANA</div>
            <div className="grid grid-cols-1 gap-1" style={{ gridTemplateColumns: `repeat(${meta}, minmax(0,1fr))` }}>
              {Array.from({ length: meta }, (_, i) => {
                const hecha = i < hechasSemana;
                const siguiente = i === hechasSemana;
                return (
                  <div key={i} className="flex flex-col items-center gap-1.5">
                    <div
                      className={`flex aspect-square w-full max-w-[44px] items-center justify-center rounded-sm border-2 ${
                        hecha ? 'border-voltaje bg-voltaje text-asfalto' : siguiente ? 'border-voltaje text-voltaje' : 'border-dashed border-grafito'
                      }`}
                    >
                      {hecha && <Icono nombre="check" tam={18} grosor={3} />}
                    </div>
                    <span className={`font-metrica text-xs ${siguiente ? 'text-voltaje' : 'text-niebla'}`}>S{i + 1}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <p className="mt-auto text-[15px] text-niebla">
            <strong className="text-hueso">
              Vas {hechasSemana} de {meta} esta semana.
            </strong>{' '}
            La semana cuenta con 2 sesiones o más.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="relative flex flex-col gap-5 overflow-hidden rounded border border-grafito bg-concreto p-6">
          <div aria-hidden className="pointer-events-none absolute -right-2 -top-6 font-titulo text-[140px] leading-none text-[#212125]">
            IMC
          </div>
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <div className="font-metrica text-xs tracking-[.06em] text-niebla">IMC ACTUAL</div>
              <div className="cifra mt-1 text-[56px] font-bold leading-none tracking-[-.04em]">{imc != null ? formatoNumero(imc, 2) : '--'}</div>
            </div>
            {clase && (
              <span className="rounded-sm px-2.5 py-1.5 etiqueta text-asfalto" style={{ background: COLOR_IMC[clase] }}>
                {CLASIFICACIONES_IMC[clase].toUpperCase()}
              </span>
            )}
          </div>
          <div className="relative">
            <MedidorImc imc={imc} compacto />
            <div className="mt-2 flex justify-between font-metrica text-[11px] text-niebla">
              <span>15</span>
              <span>18,5</span>
              <span>25</span>
              <span>30</span>
              <span>40</span>
            </div>
          </div>
          {imcInicial != null && progreso.corporal.length > 1 && (
            <p className="relative text-[15px]">
              <span className={`font-metrica font-bold ${difImc <= 0 ? 'text-exito' : 'text-advertencia'}`}>
                {difImc > 0 ? '+' : ''}
                {formatoNumero(difImc, 2)}
              </span>{' '}
              desde que empezaste ({formatoNumero(imcInicial, 2)}).{' '}
              <span className="text-niebla">{difImc <= 0 ? 'Vas por buen camino.' : 'Sin afán: lo importante es la constancia.'}</span>
            </p>
          )}
        </div>

        <div className="tarjeta flex flex-col gap-4 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="font-metrica text-xs tracking-[.06em] text-niebla">PESO · ÚLTIMOS 60 DÍAS</div>
              <div className="cifra mt-1 text-[44px] font-bold leading-none tracking-[-.04em]">
                {pesoFin != null ? formatoNumero(pesoFin, 1) : '--'} <span className="text-lg font-normal text-niebla">kg</span>
              </div>
            </div>
            {corporal.length > 1 && (
              <span className={`rounded-sm px-2.5 py-1.5 font-metrica text-sm font-bold ${difPeso <= 0 ? 'bg-exito/10 text-exito' : 'bg-advertencia/10 text-advertencia'}`}>
                {difPeso > 0 ? '+' : ''}
                {formatoNumero(difPeso, 1)} kg
              </span>
            )}
          </div>
          {corporal.length > 1 ? (
            <GraficaLinea
              etiqueta={`Peso de ${formatoNumero(pesoIni!, 1)} kg a ${formatoNumero(pesoFin!, 1)} kg en los últimos 60 días`}
              datos={corporal.map((c) => ({ x: fechaCorta(c.fecha), y: c.peso_kg }))}
              unidad="kg"
            />
          ) : (
            <p className="text-niebla">Registra tu peso desde tu perfil una vez por semana y aquí verás la gráfica.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="tarjeta flex flex-col gap-4 p-6">
          <div className="flex items-baseline justify-between">
            <span className="font-metrica text-xs tracking-[.06em] text-niebla">ADHERENCIA SEMANAL</span>
            <span className="cifra text-sm font-bold text-voltaje">META {meta}/SEM</span>
          </div>
          <div className="relative flex h-[120px] items-end gap-1.5 border-b-2 border-grafito">
            <div className="absolute inset-x-0 border-t border-dashed border-niebla" style={{ bottom: '100%' }} />
            {ultimas.length === 0 && <span className="pb-3 text-sm text-niebla">Aún no hay sesiones registradas.</span>}
            {ultimas.map((s) => {
              const actual = s.semana_iso === semanaIso();
              return (
                <div
                  key={s.semana_iso}
                  title={`${etiquetaSemana(s.semana_iso)}: ${s.sesiones} sesiones`}
                  className={`flex-1 transition-[height] duration-arranque ease-fitia ${actual ? 'border-2 border-voltaje' : s.sesiones >= meta ? 'bg-voltaje' : 'bg-voltaje/50'}`}
                  style={{ height: `${Math.min(1, s.sesiones / meta) * 100}%` }}
                />
              );
            })}
          </div>
          <div className="flex justify-between font-metrica text-[11px] text-niebla">
            <span>{ultimas[0] ? etiquetaSemana(ultimas[0].semana_iso) : ''}</span>
            <span>META {meta}/SEM</span>
            <span>HOY</span>
          </div>
        </div>

        <div className={`flex flex-col gap-3.5 rounded border bg-concreto p-6 ${cupo > 0 ? 'border-grafito' : 'border-advertencia'}`}>
          <div className="flex items-center gap-2.5">
            <Icono nombre="ia" className="text-voltaje" />
            <span className="font-metrica text-xs tracking-[.06em] text-niebla">RUTINAS IA</span>
          </div>
          <div className="font-titulo text-[28px] uppercase leading-none">{textoCupo(cupo)}</div>
          <p className="text-sm text-niebla">
            {cupo > 0
              ? 'Genera una nueva cuando cambies de objetivo o de molestias.'
              : esVerdadero(perfil?.plan?.con_publicidad)
                ? 'Se recargan el 1 del próximo mes. Con Pro tienes 10 al mes.'
                : 'Se recargan el 1 del próximo mes.'}
          </p>
          <Boton variante="secundario" tam="sm" className="mt-auto" onClick={() => navigate('/app/rutina')}>
            Ir a mi rutina
          </Boton>
        </div>

        <Link
          to="/app/lumbar"
          className="relative flex flex-col gap-3 overflow-hidden rounded border border-grafito bg-concreto p-6 text-left text-hueso no-underline transition-[transform,box-shadow] duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:text-hueso hover:shadow-[6px_6px_0_#3DDC84]"
        >
          <div aria-hidden className="absolute -bottom-8 -right-1.5 font-titulo text-[140px] leading-none text-[#232327]">
            L5
          </div>
          <span className="relative flex h-12 w-12 items-center justify-center rounded border-2 border-exito text-exito">
            <Icono nombre="lumbar" tam={24} />
          </span>
          <span className="relative font-titulo text-[28px] uppercase leading-none">Zona lumbar</span>
          <span className="relative text-[15px] text-niebla">Ejercicios para tu espalda, con técnica y el sello de los que son seguros para ti.</span>
          <span className="relative mt-auto font-semibold text-voltaje">Ver biblioteca →</span>
        </Link>
      </div>

      <BannerAnuncio />
    </div>
  );
}
