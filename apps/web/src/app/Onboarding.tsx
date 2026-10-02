import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ACTIVIDADES, ApiError, calcularImc, clasificarImc, formatoNumero, MOLESTIAS, OBJETIVOS, SEXOS,
  type CodigoCondicion, type NivelActividad, type Objetivo, type RutinaGenerada, type Sexo,
} from '@fitia/shared';
import { api } from '../api';
import { useSesion } from '../auth/SesionContext';
import { Boton } from '../ui/Boton';
import { CampoNumero } from '../ui/Campos';
import { Aviso, mensajeError } from '../ui/Estados';
import { Icono } from '../ui/Iconos';
import { Simbolo } from '../ui/Logo';
import { COLOR_IMC, MedidorImc, MENSAJE_IMC, SEGMENTOS } from '../ui/MedidorImc';

const num = (v: string) => parseFloat(v.replace(',', '.'));
const PASOS = ['Tú', 'Medidas', 'Objetivo', 'Molestias'];
const SEVERIDAD = [
  { v: 1, l: 'Leve' },
  { v: 2, l: 'Moderada' },
  { v: 3, l: 'Fuerte' },
] as const;
const DIAS = [2, 3, 4, 5, 6];
const MINUTOS = [30, 45, 60, 90];

function Pastilla<T>({ opciones, valor, onCambio, etiqueta }: { opciones: { v: T; l: string }[]; valor: T; onCambio: (v: T) => void; etiqueta: string }) {
  return (
    <div role="group" aria-label={etiqueta} className="flex w-max max-w-full overflow-hidden rounded border-2 border-grafito">
      {opciones.map((o) => (
        <button
          key={String(o.v)}
          type="button"
          aria-pressed={o.v === valor}
          onClick={() => onCambio(o.v)}
          className={`min-h-[48px] min-w-[52px] px-3.5 font-metrica text-[15px] font-bold ${
            o.v === valor ? 'bg-voltaje text-asfalto' : 'text-hueso hover:bg-concreto'
          }`}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}

function TarjetaGrande({ on, onClick, titulo, detalle, alto = 'min-h-[104px]' }: { on: boolean; onClick: () => void; titulo: string; detalle?: string; alto?: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`flex ${alto} flex-col items-start justify-between gap-2 rounded border-2 p-4 text-left transition-colors duration-golpe active:translate-y-0.5 ${
        on ? 'border-voltaje bg-voltaje text-asfalto' : 'border-grafito text-hueso hover:border-niebla'
      }`}
    >
      <span className="flex w-full items-start justify-between gap-2 text-[17px] font-bold">
        {titulo}
        {on && <Icono nombre="check" tam={18} grosor={3} />}
      </span>
      {detalle && <span className={`text-sm ${on ? 'text-asfalto/80' : 'text-niebla'}`}>{detalle}</span>}
    </button>
  );
}

type Fase = 'formulario' | 'generando' | 'lista' | 'sinCupo' | 'error';

export function Onboarding() {
  const { perfil, setPerfil, recargarPerfil } = useSesion();
  const navigate = useNavigate();
  const { state } = useLocation() as { state?: { peso?: number; estatura?: number } };
  const previo = perfil?.perfil;
  const cond = (c: CodigoCondicion) => perfil?.condiciones.find((x) => x.codigo === c);

  const [paso, setPaso] = useState(0);
  const [intento, setIntento] = useState(false);
  const [edad, setEdad] = useState(perfil?.edad ? String(perfil.edad) : '');
  const [sexo, setSexo] = useState<Sexo>(perfil?.sexo && perfil.sexo !== 'N' ? perfil.sexo : 'N');
  const [peso, setPeso] = useState(String(state?.peso ?? perfil?.medicion_actual.peso_kg ?? ''));
  const [est, setEst] = useState(String(state?.estatura ?? perfil?.medicion_actual.estatura_cm ?? ''));
  const [act, setAct] = useState<NivelActividad | null>(previo?.nivel_actividad ?? null);
  const [obj, setObj] = useState<Objetivo | null>(previo?.objetivo ?? null);
  const [mol, setMol] = useState<CodigoCondicion[]>(
    perfil?.condiciones.filter((c) => c.origen === 'AUTORREPORTE').map((c) => c.codigo) ?? [],
  );
  const [ninguna, setNinguna] = useState(false);
  const [sev, setSev] = useState<Partial<Record<CodigoCondicion, 1 | 2 | 3>>>(
    Object.fromEntries(MOLESTIAS.map((m) => [m.valor, cond(m.valor)?.severidad ?? 1])),
  );
  const [dias, setDias] = useState(previo?.dias_disponibles ?? 3);
  const [min, setMin] = useState(previo?.minutos_por_sesion ?? 45);

  const [fase, setFase] = useState<Fase>('formulario');
  const [pasoGen, setPasoGen] = useState(0);
  const [rutina, setRutina] = useState<RutinaGenerada | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<number>();
  useEffect(() => () => window.clearInterval(timer.current), []);

  const nombre = perfil?.nombre?.split(' ')[0] ?? '';
  const p = num(peso);
  const e = num(est);
  const okP = p >= 30 && p <= 250;
  const okE = e >= 120 && e <= 220;
  const imc = okP && okE ? calcularImc(p, e) : null;
  const clase = imc != null ? clasificarImc(imc) : null;
  const ed = num(edad);
  const okEdad = Number.isInteger(ed) && ed >= 14 && ed <= 90;

  const errorPaso = (i = paso): string => {
    if (i === 0) return okEdad ? '' : 'Escribe una edad válida (14 a 90 años).';
    if (i === 1) return okP && okE ? '' : 'Revisa peso y estatura.';
    if (i === 2) return act && obj ? '' : 'Elige tu nivel de actividad y tu objetivo.';
    return mol.length || ninguna ? '' : 'Elige tus molestias o marca “Ninguna”.';
  };
  const errActual = intento ? errorPaso() : '';

  const toggleMol = (c: CodigoCondicion) => {
    setNinguna(false);
    setMol((m) => (m.includes(c) ? m.filter((x) => x !== c) : [...m, c]));
  };
  const avisoMedico = mol.includes('HIPERTENSION') || mol.some((m) => sev[m] === 3);

  async function armar() {
    setFase('generando');
    setPasoGen(0);
    setError(null);
    const t0 = Date.now();
    timer.current = window.setInterval(() => setPasoGen((s) => Math.min(s + 1, 3)), 900);
    try {
      await api.perfil.medicion({ peso_kg: p, estatura_cm: e });
      const anioNac = new Date().getFullYear() - ed;
      const cambiaEdad = perfil?.edad !== ed;
      const nuevo = await api.perfil.actualizar({
        nivel_actividad: act!,
        objetivo: obj!,
        dias_disponibles: dias,
        minutos_por_sesion: min,
        lugar_entreno: previo?.lugar_entreno ?? 'GIMNASIO',
        condiciones: mol.map((c) => ({ codigo: c, severidad: sev[c] ?? 1 })),
        sexo,
        ...(cambiaEdad ? { fecha_nacimiento: `${anioNac}-01-01` } : {}),
      });
      setPerfil(nuevo);
      const r = await api.rutinas.generar();
      setRutina(r);
      // La animación de 4 pasos dura al menos ~3,6 s aunque el Mock responda al instante
      await new Promise((res) => setTimeout(res, Math.max(0, 3600 - (Date.now() - t0))));
      setPasoGen(4);
      setFase('lista');
    } catch (ex) {
      if (ex instanceof ApiError && ex.codigo === 'CUPO_IA_AGOTADO') setFase('sinCupo');
      else {
        setError(mensajeError(ex));
        setFase('error');
      }
    } finally {
      window.clearInterval(timer.current);
      recargarPerfil();
    }
  }

  const siguiente = () => {
    setIntento(true);
    if (errorPaso()) return;
    setIntento(false);
    if (paso < 3) setPaso(paso + 1);
    else armar();
  };

  const lumbar = mol.includes('DOLOR_LUMBAR') ? `lumbar ${SEVERIDAD.find((s) => s.v === sev.DOLOR_LUMBAR)?.l.toLowerCase()}` : 'sin molestia lumbar';
  const itemsGen = [
    `Leyendo tu perfil: IMC ${imc != null ? formatoNumero(imc, 2) : '—'} · ${lumbar}`,
    'Quitando ejercicios contraindicados para ti',
    `Ajustando a ${dias} días de ${min} minutos`,
    'Revisando que todo sea seguro para ti',
  ];

  if (fase !== 'formulario') {
    const corriendo = fase === 'generando';
    const titulo =
      fase === 'generando'
        ? 'La IA está armando tu rutina…'
        : fase === 'lista'
          ? `¡Tu rutina está lista${nombre ? `, ${nombre}` : ''}!`
          : fase === 'sinCupo'
            ? 'Perfil guardado.'
            : 'No pudimos terminar.';
    return (
      <div role="dialog" aria-modal="true" aria-label="Armando tu rutina" className="fixed inset-0 z-50 flex items-center justify-center overflow-auto bg-asfalto p-6">
        <div className="grano pointer-events-none absolute inset-0 opacity-[.08]" />
        <div className="relative flex w-full max-w-[600px] flex-col gap-6">
          <span className="flex h-[88px] w-[88px] -rotate-[7deg] items-center justify-center rounded bg-voltaje text-asfalto">
            <Icono nombre={fase === 'lista' ? 'check' : fase === 'generando' ? 'ia' : 'alerta'} tam={44} className={corriendo ? 'animate-pulso' : ''} />
          </span>
          <h2 className="font-titulo text-[clamp(44px,7vw,88px)] font-normal uppercase leading-[.88]">{titulo}</h2>
          {(corriendo || fase === 'lista') && (
            <>
              <div className="relative h-2.5 overflow-hidden bg-concreto">
                <div className="h-full bg-voltaje transition-[width] duration-arranque ease-fitia" style={{ width: `${(Math.min(pasoGen, 4) / 4) * 100}%` }} />
              </div>
              <ul className="m-0 flex list-none flex-col gap-3 p-0">
                {itemsGen.map((t, i) => {
                  const hecho = i < pasoGen;
                  const ahora = i === pasoGen && corriendo;
                  return (
                    <li key={t} className={`flex items-center gap-3 text-[17px] transition-colors ${hecho ? 'text-hueso' : ahora ? 'text-voltaje' : 'text-humo'}`}>
                      <span className="flex h-6 w-6 flex-none items-center justify-center">
                        {hecho ? <Icono nombre="check" className="text-voltaje" grosor={2.5} /> : ahora ? <span className="h-2.5 w-2.5 animate-pulso bg-voltaje" /> : <span className="h-2 w-2 bg-grafito" />}
                      </span>
                      {t}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
          {fase === 'lista' && rutina && (
            <>
              {rutina.proveedor === 'mock' ? (
                <Aviso tono="advertencia" titulo="Rutina base segura.">
                  La armamos con reglas de seguridad, sin el modelo de IA. Está pensada para tu perfil y tus molestias.
                </Aviso>
              ) : (
                <Aviso tono="ia" titulo="Generada por IA y validada.">
                  {rutina.explicacion}
                </Aviso>
              )}
              <div className="flex flex-wrap gap-3">
                <Boton tam="lg" onClick={() => navigate('/app/rutina', { replace: true })}>
                  Ver mi rutina <Icono nombre="flecha" />
                </Boton>
                <Boton tam="lg" variante="secundario" onClick={() => navigate('/app', { replace: true })}>
                  Ir al inicio
                </Boton>
              </div>
            </>
          )}
          {fase === 'sinCupo' && (
            <>
              <Aviso tono="advertencia" titulo="Ya usaste tus rutinas IA de este mes.">
                Guardamos tu perfil y tus medidas. Sigue con la rutina que ya tienes o pásate a Pro para generar una nueva hoy.
              </Aviso>
              <div className="flex flex-wrap gap-3">
                <Boton tam="lg" onClick={() => navigate('/app', { replace: true })}>
                  Ir al inicio
                </Boton>
                <Boton tam="lg" variante="secundario" onClick={() => navigate('/app/planes')}>
                  Pásate a Pro
                </Boton>
              </div>
            </>
          )}
          {fase === 'error' && (
            <>
              <Aviso tono="error">{error}</Aviso>
              <div className="flex flex-wrap gap-3">
                <Boton tam="lg" onClick={armar}>
                  Reintentar
                </Boton>
                <Boton tam="lg" variante="secundario" onClick={() => setFase('formulario')}>
                  Revisar mis datos
                </Boton>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none fixed -bottom-[4vw] -right-[2vw] font-titulo text-[clamp(240px,34vw,520px)] leading-[.8] text-transparent"
        style={{ WebkitTextStroke: '2px #1A1A1D' }}
      >
        0{paso + 1}
      </div>
      <header className="sticky top-0 z-[5] border-b border-grafito bg-asfalto/95">
        <div className="mx-auto flex max-w-[960px] items-center justify-between gap-4 px-[clamp(16px,4vw,40px)] py-3">
          <span className="flex items-center gap-2">
            <Simbolo ancho={30} />
            <span className="font-titulo text-2xl leading-none">
              FIT<span className="text-voltaje">IA</span>
            </span>
          </span>
          <span className="cifra text-sm font-bold">PASO {paso + 1} DE 4</span>
          <button onClick={() => navigate('/app')} className="min-h-[44px] rounded px-3 text-[15px] font-semibold text-niebla hover:bg-concreto hover:text-hueso">
            Luego
          </button>
        </div>
        <div className="mx-auto grid max-w-[960px] grid-cols-4 gap-1 px-[clamp(16px,4vw,40px)] pb-3.5">
          {PASOS.map((l, i) => (
            <div key={l} className="flex flex-col gap-1.5">
              <div className="h-1.5 bg-grafito">
                <div className="h-full bg-voltaje transition-[width] duration-500 ease-fitia" style={{ width: i <= paso ? '100%' : '0%' }} />
              </div>
              <span className={`text-xs font-semibold ${i <= paso ? 'text-hueso' : 'text-niebla'}`}>{l}</span>
            </div>
          ))}
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-[960px] flex-1 px-[clamp(16px,4vw,40px)] pb-[140px] pt-10">
        <div key={paso} className="flex animate-entrada flex-col gap-7">
          {paso === 0 && (
            <>
              <div>
                <div className="kicker">PASO 01 · TÚ</div>
                <h1 className="mt-2 font-titulo text-[clamp(44px,6vw,88px)] font-normal uppercase leading-[.9]">
                  Primero,
                  <br />
                  cuéntanos de ti.
                </h1>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-semibold">¿Cómo te llamas?</span>
                  <input
                    value={perfil?.nombre ?? ''}
                    disabled
                    className="min-h-[56px] rounded border-2 border-grafito bg-carbon px-4 text-lg text-niebla"
                  />
                  <span className="text-sm text-niebla">Lo tomamos de tu cuenta.</span>
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-semibold">Edad</span>
                  <input
                    inputMode="numeric"
                    value={edad}
                    onChange={(ev) => setEdad(ev.target.value.replace(/\D/g, '').slice(0, 2))}
                    placeholder="28"
                    className={`min-h-[56px] rounded border-2 bg-asfalto px-4 font-metrica text-2xl font-bold text-hueso focus:border-voltaje focus:outline-none ${
                      intento && !okEdad ? 'border-error' : 'border-grafito'
                    }`}
                  />
                  <span className={`text-sm ${intento && !okEdad ? 'text-error' : 'text-niebla'}`}>FitIA es para personas de 14 a 90 años.</span>
                </label>
              </div>
              <div className="flex flex-col gap-2.5">
                <span className="text-sm font-semibold">
                  Sexo <span className="font-normal text-niebla">· lo usamos para ajustar cargas</span>
                </span>
                <div className="flex flex-wrap gap-2">
                  {SEXOS.map((s) => (
                    <button
                      key={s.valor}
                      type="button"
                      aria-pressed={sexo === s.valor}
                      onClick={() => setSexo(s.valor)}
                      className={`min-h-[52px] rounded border-2 px-5 text-base font-semibold ${
                        sexo === s.valor ? 'border-voltaje bg-voltaje text-asfalto' : 'border-grafito hover:border-niebla'
                      }`}
                    >
                      {s.etiqueta}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {paso === 1 && (
            <>
              <div>
                <div className="kicker">PASO 02 · MEDIDAS</div>
                <h1 className="mt-2 font-titulo text-[clamp(44px,6vw,88px)] font-normal uppercase leading-[.9]">
                  ¿Cuánto pesas
                  <br />
                  y mides?
                </h1>
              </div>
              <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-2">
                <div className="flex flex-col gap-5">
                  <CampoNumero etiqueta="Peso" valor={peso} onCambio={setPeso} unidad="kg" error={intento && !okP && 'Escribe un peso entre 30 y 250 kg.'} />
                  <CampoNumero etiqueta="Estatura" valor={est} onCambio={setEst} unidad="cm" inputMode="numeric" error={intento && !okE && 'Escribe una estatura entre 120 y 220 cm.'} />
                </div>
                <div aria-live="polite" className="relative flex flex-col gap-4 overflow-hidden rounded border border-grafito bg-concreto p-6 shadow-[8px_8px_0_#2A2A2E]">
                  <div aria-hidden className="absolute -right-2 -top-6 font-titulo text-[140px] leading-none text-[#212125]">IMC</div>
                  <div className="relative flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <div className="font-metrica text-xs tracking-[.06em] text-niebla">TU IMC, EN VIVO</div>
                      <div className="cifra text-[72px] font-bold leading-none tracking-[-.04em] text-voltaje">{imc != null ? formatoNumero(imc, 2) : '--,-'}</div>
                    </div>
                    {clase && (
                      <span className="rounded-sm px-2.5 py-1.5 text-[13px] font-bold tracking-[.08em] text-asfalto" style={{ background: COLOR_IMC[clase] }}>
                        {SEGMENTOS.find((s) => s.clase === clase)!.etiqueta.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <MedidorImc imc={imc} compacto />
                  </div>
                  <p className="relative text-[15px]">
                    {clase ? MENSAJE_IMC[clase] : 'Escribe tu peso y estatura.'} <span className="text-niebla">Es una referencia, no un juicio.</span>
                  </p>
                </div>
              </div>
            </>
          )}

          {paso === 2 && (
            <>
              <div>
                <div className="kicker">PASO 03 · OBJETIVO</div>
                <h1 className="mt-2 font-titulo text-[clamp(44px,6vw,88px)] font-normal uppercase leading-[.9]">
                  ¿Cómo te mueves
                  <br />y qué buscas?
                </h1>
              </div>
              <div className="flex flex-col gap-3">
                <span className="text-sm font-semibold">Nivel de actividad hoy</span>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {ACTIVIDADES.map((a) => (
                    <TarjetaGrande key={a.valor} on={act === a.valor} onClick={() => setAct(a.valor)} titulo={a.etiqueta} detalle={a.detalle} />
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <span className="text-sm font-semibold">Tu objetivo principal</span>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                  {OBJETIVOS.map((o) => (
                    <TarjetaGrande key={o.valor} on={obj === o.valor} onClick={() => setObj(o.valor)} titulo={o.etiqueta} detalle={o.detalle} />
                  ))}
                </div>
              </div>
            </>
          )}

          {paso === 3 && (
            <>
              <div>
                <div className="kicker">PASO 04 · MOLESTIAS Y TIEMPO</div>
                <h1 className="mt-2 font-titulo text-[clamp(44px,6vw,88px)] font-normal uppercase leading-[.9]">
                  ¿Algo te
                  <br />
                  molesta?
                </h1>
                <p className="mt-3 text-[17px] text-niebla">Elige todas las que apliquen. Así la IA saca lo que te puede lastimar.</p>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {MOLESTIAS.map((m) => (
                  <TarjetaGrande key={m.valor} alto="min-h-[88px]" on={mol.includes(m.valor)} onClick={() => toggleMol(m.valor)} titulo={m.etiqueta} detalle={m.detalle} />
                ))}
                <TarjetaGrande
                  alto="min-h-[88px]"
                  on={ninguna}
                  onClick={() => {
                    setNinguna(true);
                    setMol([]);
                  }}
                  titulo="Ninguna"
                  detalle="Estoy al 100"
                />
              </div>
              {mol
                .filter((m) => m !== 'HIPERTENSION')
                .map((m) => (
                  <div key={m} className="flex flex-wrap items-center justify-between gap-3 rounded border border-grafito bg-concreto px-4 py-3.5">
                    <span className="font-semibold">{MOLESTIAS.find((x) => x.valor === m)!.etiqueta}: ¿qué tan fuerte?</span>
                    <Pastilla
                      etiqueta="Severidad"
                      opciones={SEVERIDAD.map((s) => ({ v: s.v, l: s.l }))}
                      valor={sev[m] ?? 1}
                      onCambio={(v) => setSev((s) => ({ ...s, [m]: v }))}
                    />
                  </div>
                ))}
              {avisoMedico && (
                <Aviso tono="advertencia">
                  Te recomendamos hablar con un médico antes de empezar. Igual armamos una rutina suave y de bajo impacto.
                </Aviso>
              )}
              <div className="flex flex-wrap gap-6">
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-semibold">Días por semana</span>
                  <Pastilla etiqueta="Días por semana" opciones={DIAS.map((d) => ({ v: d, l: String(d) }))} valor={dias} onCambio={setDias} />
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-semibold">Minutos por sesión</span>
                  <Pastilla etiqueta="Minutos por sesión" opciones={MINUTOS.map((d) => ({ v: d, l: String(d) }))} valor={min} onCambio={setMin} />
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-[5] border-t border-grafito bg-asfalto/95">
        <div className="mx-auto flex max-w-[960px] items-center justify-between gap-3 px-[clamp(16px,4vw,40px)] py-3.5">
          <Boton variante="secundario" disabled={paso === 0} onClick={() => setPaso(paso - 1)}>
            Atrás
          </Boton>
          {errActual && (
            <span role="alert" className="flex-1 text-center text-sm text-error">
              {errActual}
            </span>
          )}
          <Boton onClick={siguiente}>
            {paso === 3 ? 'Armar mi rutina' : 'Siguiente'} <Icono nombre="flecha" />
          </Boton>
        </div>
      </footer>
    </div>
  );
}
