import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CartesianGrid, ComposedChart, Line, ReferenceArea, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import type {
  AccionRemediacion, Anomalia, EstadoMonitor, LineaBaseActual, Metrica, SerieMetrica, ServicioSalud, TipoAccion,
} from '@fitia/shared';
import { admin } from '../api';
import { usePolling } from '../hooks/usePolling';
import { decimal, duracion, entero, fecha, hora } from '../lib/formato';
import { useReloj } from '../shell/Cabecera';
import { useSalud } from '../shell/SaludContext';
import { ErrorEstado, Cargando, mensajeError } from '../ui/Estados';
import { ICONOS, Icono } from '../ui/Iconos';
import { Sparkline } from '../ui/Sparkline';
import { useToast } from '../ui/Toasts';

const VENTANA_MIN = 15;
const C = { hueso: '#F2F0EB', niebla: '#9A9AA0', voltaje: '#D4FF00', senal: '#FF4D1A', exito: '#3DDC84', advertencia: '#FFB020', grafito: '#2A2A2E', rejilla: '#232327' };
const FASES = ['Monitor', 'Analizar', 'Planificar', 'Ejecutar', 'Verificar'] as const;
type Fase = (typeof FASES)[number];
const COLOR_FASE: Record<Fase, string> = { Monitor: C.hueso, Analizar: C.advertencia, Planificar: C.voltaje, Ejecutar: C.senal, Verificar: C.exito };
const NOMBRE_SERVICIO: Record<string, string> = { api: 'API', ia: 'IA', db: 'BASE DE DATOS', web: 'WEB' };
const NOMBRE_METRICA: Record<Metrica, string> = {
  LATENCIA_MS: 'Latencia', TASA_ERROR: 'Tasa de error', RPS: 'Peticiones/s', CPU_PCT: 'CPU', MEM_PCT: 'Memoria',
};
const ETIQUETA: Record<TipoAccion, [string, string, string]> = {
  ESCALAR_ARRIBA: ['ESCALAR ↑', 'rgba(212,255,0,.14)', C.voltaje],
  ESCALAR_ABAJO: ['ESCALAR ↓', C.grafito, '#C8C8CC'],
  CAMBIAR_PROVEEDOR_IA: ['FALLBACK', 'rgba(255,176,32,.14)', C.advertencia],
  CIRCUIT_BREAKER: ['BREAKER', 'rgba(255,176,32,.14)', C.advertencia],
  REINICIAR_WORKER: ['REINICIO', 'rgba(255,77,26,.14)', C.senal],
  LIMPIAR_CACHE: ['CACHÉ', C.grafito, '#C8C8CC'],
  NOTIFICAR_ADMIN: ['ALERTA', 'rgba(255,59,59,.14)', '#FF3B3B'],
};

interface Datos {
  servicios: ServicioSalud[];
  estado: EstadoMonitor;
  latencia: SerieMetrica;
  minis: Record<'TASA_ERROR' | 'RPS' | 'CPU_PCT' | 'MEM_PCT', SerieMetrica>;
  anomalias: Anomalia[];
  acciones: AccionRemediacion[];
}

async function cargar(): Promise<Datos> {
  const m = admin.monitoreo;
  const mini = (metrica: Metrica) => m.metricas({ servicio: 'api', metrica, min: VENTANA_MIN, paso: '30s' });
  const [servicios, estado, latencia, err, rps, cpu, mem, anomalias, acciones] = await Promise.all([
    m.servicios(), m.estado(), m.metricas({ servicio: 'api', metrica: 'LATENCIA_MS', min: VENTANA_MIN, paso: '10s' }),
    mini('TASA_ERROR'), mini('RPS'), mini('CPU_PCT'), mini('MEM_PCT'), m.anomalias({ limite: 40 }), m.acciones(40),
  ]);
  return { servicios, estado, latencia, minis: { TASA_ERROR: err, RPS: rps, CPU_PCT: cpu, MEM_PCT: mem }, anomalias, acciones };
}

const base = (e: EstadoMonitor | undefined, servicio: string, metrica: Metrica): LineaBaseActual | undefined =>
  e?.lineas_base.find((b) => b.servicio === servicio && b.metrica === metrica);

export default function Monitoreo() {
  const sondeo = usePolling(cargar, 5000);
  const avisar = useToast();
  const salud = useSalud();
  const reloj = useReloj();
  const [simulando, setSimulando] = useState(false);
  const d = sondeo.datos;

  // "Incidente cerrado" cuando el sondeo ve que una anomalía abierta pasó a MITIGADA
  const abiertasAntes = useRef<Set<number> | null>(null);
  useEffect(() => {
    if (!d) return;
    const abiertas = new Set(d.anomalias.filter((a) => a.estado === 'ABIERTA').map((a) => a.id));
    abiertasAntes.current?.forEach((id) => {
      const a = d.anomalias.find((x) => x.id === id);
      if (a && a.estado === 'MITIGADA') {
        const seg = a.resuelta_en ? (fecha(a.resuelta_en).getTime() - fecha(a.detectada_en).getTime()) / 1000 : 0;
        avisar('ok', 'Incidente cerrado', `${NOMBRE_METRICA[a.metrica]} ${NOMBRE_SERVICIO[a.servicio] ?? a.servicio} normal tras ${duracion(seg)}`);
      }
    });
    abiertasAntes.current = abiertas;
  }, [d, avisar]);

  const incidenteApi = d?.anomalias.find((a) => a.estado === 'ABIERTA' && a.servicio === 'api' && a.metrica === 'LATENCIA_MS');

  async function simular() {
    setSimulando(true);
    try {
      const r = await admin.monitoreo.simularPico({ servicio: 'api', metrica: 'LATENCIA_MS' });
      const an = r.ciclo.anomalias[0];
      if (an) {
        avisar('sig', 'Anomalía detectada', `Latencia API ${decimal(an.zscore)}σ sobre la línea base · ${an.severidad}`);
        r.ciclo.acciones.forEach((a, i) =>
          window.setTimeout(() => avisar(a.tipo === 'NOTIFICAR_ADMIN' ? 'warn' : 'ia', 'Remediación ejecutada', a.detalle), 700 * (i + 1)));
      } else {
        const yaAbierta = r.ciclo.omitido ? false : (await admin.monitoreo.anomalias({ estado: 'ABIERTA', limite: 20 }))
          .some((a) => a.servicio === 'api' && a.metrica === 'LATENCIA_MS');
        avisar('warn', 'Pico registrado sin anomalía nueva', r.ciclo.omitido
          ? 'El worker estaba analizando: lo verás en su próximo ciclo.'
          : yaAbierta
            ? 'Ya hay un incidente abierto en la latencia de la API.'
            : `El pico no superó z > ${decimal(sondeo.datos?.estado.umbral_z ?? 3)}. Inténtalo de nuevo.`);
      }
      await Promise.all([sondeo.refrescar(), salud?.refrescar()]);
    } catch (e) {
      avisar('err', 'No se pudo simular el pico', mensajeError(e));
    } finally {
      setSimulando(false);
    }
  }

  const ocupado = simulando || !!incidenteApi;
  const textoBoton = simulando
    ? 'Inyectando pico…'
    : incidenteApi
      ? `Incidente en curso · ${duracion((Date.now() - fecha(incidenteApi.detectada_en).getTime()) / 1000)}`
      : 'Simular pico de tráfico';

  return (
    <div className="flex animate-entrada flex-col gap-[14px]">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="kicker">MONITOREO · AUTOSANACIÓN MAPE-K · {reloj}</div>
          <h1 className="titulo-pagina">Sala de control</h1>
        </div>
        <div className="flex items-center gap-[10px]">
          {d && (
            <span className="font-metrica text-[12px] text-niebla">
              UMBRAL z &gt; {decimal(d.estado.umbral_z)} · CICLO {d.estado.intervalo_seg} s · VENTANA {d.estado.ventana_min} min
            </span>
          )}
          <button type="button" onClick={() => void simular()} disabled={ocupado || !d}
            className={`inline-flex min-h-[44px] items-center gap-[10px] rounded px-[18px] text-[14px] font-bold text-asfalto transition-[transform,box-shadow] duration-[90ms] ${
              ocupado || !d ? 'cursor-not-allowed bg-tenue shadow-[0_4px_0_#2A2A2E]' : 'bg-senal shadow-senal active:translate-y-[2px] active:shadow-senal-2'
            }`}>
            <Icono d={ICONOS.rayo} tam={18} grosor={2.5} />
            {textoBoton}
          </button>
        </div>
      </header>

      {!d ? (
        sondeo.error ? <ErrorEstado error={sondeo.error} reintentar={() => void sondeo.refrescar()} /> : <Cargando texto="Conectando con el monitor…" />
      ) : (
        <>
          {sondeo.error && (
            <div role="alert" className="rounded border border-advertencia/60 bg-advertencia/[.06] px-3 py-2 text-[13px] text-advertencia">
              Se perdió la conexión con la API ({mensajeError(sondeo.error)}). Mostrando los últimos datos.
            </div>
          )}
          {!d.estado.worker.activo && (
            <div role="status" className="flex flex-wrap items-center gap-2 rounded border border-advertencia/60 bg-advertencia/[.06] px-3 py-2 text-[13px]">
              <span className="font-bold text-advertencia">El worker MAPE-K no está corriendo.</span>
              <span className="text-niebla">El pico se detecta igual, pero nadie verificará la mitigación. Arráncalo con</span>
              <code className="font-metrica text-[12px] text-hueso">npm run worker</code>
              {d.estado.worker.ultimo_ciclo && <span className="text-niebla">· último ciclo {hora(d.estado.worker.ultimo_ciclo)}</span>}
            </div>
          )}
          <Servicios datos={d} />
          <div className="grid grid-cols-[minmax(0,2.2fr)_minmax(280px,1fr)] gap-[10px]">
            <GraficaLatencia datos={d} />
            <Minis datos={d} />
          </div>
          <div className="grid grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] gap-[10px]">
            <LineaTiempo datos={d} />
            <Bitacora acciones={d.acciones} />
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- tarjetas por servicio
function Servicios({ datos }: { datos: Datos }) {
  const orden = ['api', 'ia', 'db', 'web'];
  const servicios = [...datos.servicios].sort((a, b) => orden.indexOf(a.codigo) - orden.indexOf(b.codigo));
  return (
    <div className="grid grid-cols-4 gap-[10px]">
      {servicios.map((s) => {
        const mal = s.estado !== 'SALUDABLE';
        const p95 = base(datos.estado, s.codigo, 'LATENCIA_MS')?.p95;
        const nombre = s.codigo === 'ia' ? `IA · ${datos.estado.ia.efectivo === 'gemini' ? 'Gemini' : 'Mock'}` : NOMBRE_SERVICIO[s.codigo] ?? s.nombre;
        return (
          <div key={s.codigo} className={`flex flex-col gap-[10px] rounded border bg-concreto px-[14px] py-3 ${mal ? 'border-senal' : 'border-grafito'}`}>
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-titulo text-[20px] leading-none">{nombre}</span>
              <span className={`inline-flex flex-none items-center gap-[6px] rounded-sm px-[7px] py-[3px] text-[11px] font-bold tracking-[.06em] ${mal ? 'bg-senal/[.14] text-senal' : 'bg-exito/[.12] text-exito'}`}>
                <span className="h-[7px] w-[7px] rounded-full bg-current" />
                {mal ? (s.estado === 'CAIDO' ? 'CAÍDO' : 'DEGRADADO') : 'OPERATIVO'}
              </span>
            </div>
            <div className="flex items-end justify-between gap-2">
              <div>
                <div className={`font-metrica text-[26px] font-bold leading-none cifra ${mal ? 'text-senal' : 'text-hueso'}`}>
                  {p95 != null ? entero(p95) : '—'}
                  <span className="text-[12px] font-normal text-niebla"> ms</span>
                </div>
                <div className="etiqueta">P95</div>
              </div>
              <div className="text-right">
                <div className="font-metrica text-[13px] cifra">
                  <strong className="text-[20px]">{s.replicas_actuales}</strong> / {s.replicas_min}–{s.replicas_max}
                </div>
                <div className="etiqueta">RÉPLICAS ACT / MÍN–MÁX</div>
              </div>
            </div>
            <div className="flex gap-[3px]" aria-label={`${s.replicas_actuales} de ${s.replicas_max} réplicas`}>
              {Array.from({ length: s.replicas_max }, (_, i) => (
                <span key={i} className="h-2 flex-1 transition-colors duration-300" style={{
                  background: i < s.replicas_actuales ? (i >= s.replicas_min ? C.voltaje : C.hueso) : 'transparent',
                  border: `1px ${i < s.replicas_min ? 'solid #5A5A60' : 'dashed #3A3A40'}`,
                }} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------- gráfica en vivo
function GraficaLatencia({ datos }: { datos: Datos }) {
  const lb = base(datos.estado, 'api', 'LATENCIA_MS');
  const z = datos.estado.umbral_z;
  const ahora = Date.now();
  const desde = ahora - VENTANA_MIN * 60_000;
  // Sin tráfico no hay puntos: se corta la línea en los huecos en vez de unirlos con una recta
  const puntos = useMemo(() => {
    const salida: { t: number; valor: number | null }[] = [];
    for (const p of datos.latencia.puntos) {
      const t = fecha(p.t).getTime();
      const previo = salida[salida.length - 1];
      if (previo && t - previo.t > 30_000) salida.push({ t: previo.t + 10_000, valor: null });
      salida.push({ t, valor: p.valor });
    }
    return salida;
  }, [datos.latencia]);
  const marcas = datos.anomalias.filter((a) => a.servicio === 'api' && a.metrica === 'LATENCIA_MS' && fecha(a.detectada_en).getTime() >= desde);

  const conValor = puntos.filter((p): p is { t: number; valor: number } => p.valor !== null);
  const ultimo = conValor[conValor.length - 1];
  const umbral = lb ? lb.media + z * lb.desviacion : null;
  const zAhora = lb && ultimo ? (ultimo.valor - lb.media) / lb.desviacion : null;
  const maxY = Math.max(...conValor.map((p) => p.valor), ...marcas.map((a) => a.valor_observado), umbral ?? 0, 10) * 1.12;
  const colorAhora = zAhora != null && zAhora > z ? C.senal : C.hueso;
  const colorZ = zAhora == null ? C.niebla : zAhora > z ? C.senal : zAhora > 2 ? C.advertencia : C.niebla;

  return (
    <div className="panel flex min-w-0 flex-col gap-[10px] p-[14px]">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <span className="titulo-panel">LATENCIA API · EN VIVO</span>
          <span className="font-metrica text-[22px] font-bold cifra" style={{ color: colorAhora }}>{ultimo ? entero(ultimo.valor) : '—'} ms</span>
          <span className="font-metrica text-[13px] font-bold" style={{ color: colorZ }}>z = {zAhora == null ? '—' : `${decimal(zAhora)}σ`}</span>
        </div>
        <div className="flex gap-[14px] text-[12px] text-niebla">
          <span className="flex items-center gap-[6px]"><span className="h-[10px] w-[14px] border border-voltaje/40 bg-voltaje/[.14]" />Línea base μ ± 3σ</span>
          <span className="flex items-center gap-[6px]"><span className="w-[14px] border-t-2 border-dashed border-senal" />Umbral</span>
          <span className="flex items-center gap-[6px]"><span className="h-2 w-2 rounded-full bg-senal" />Anomalía</span>
        </div>
      </div>
      <div className="h-[230px] min-[1500px]:h-[330px]" role="img" aria-label="Latencia de la API en vivo con la banda de la línea base">
        {conValor.length < 2 ? (
          <div className="flex h-full items-center justify-center text-[13px] text-niebla">
            Aún no hay tráfico en los últimos {VENTANA_MIN} minutos. Usa la consola o simula un pico.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={puntos} margin={{ top: 8, right: 10, bottom: 0, left: 0 }}>
              <CartesianGrid stroke={C.rejilla} vertical={false} />
              <XAxis dataKey="t" type="number" domain={[desde, ahora]} ticks={[desde, desde + (ahora - desde) / 2, ahora]}
                tickFormatter={(t: number) => (t >= ahora - 1000 ? 'AHORA' : `−${decimal((ahora - t) / 60000, 1).replace(',0', '')} min`)}
                stroke={C.niebla} tick={{ fontSize: 11, fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} />
              <YAxis domain={[0, Math.ceil(maxY / 10) * 10]} width={44} stroke={C.niebla} tick={{ fontSize: 11, fontFamily: 'JetBrains Mono' }}
                tickLine={false} axisLine={false} tickCount={4} allowDecimals={false} />
              {lb && (
                <ReferenceArea y1={Math.max(0, lb.media - 3 * lb.desviacion)} y2={lb.media + 3 * lb.desviacion}
                  fill="rgba(212,255,0,.08)" stroke="rgba(212,255,0,.35)" ifOverflow="hidden" />
              )}
              {lb && <ReferenceLine y={lb.media} stroke="rgba(212,255,0,.5)" strokeDasharray="2 3" />}
              {umbral != null && <ReferenceLine y={umbral} stroke={C.senal} strokeWidth={2} strokeDasharray="6 4" strokeOpacity={0.7} />}
              <Tooltip cursor={{ stroke: C.grafito }}
                contentStyle={{ background: '#141416', border: `1px solid ${C.grafito}`, borderRadius: 4, fontSize: 12 }}
                labelFormatter={(t: number) => hora(new Date(t))} formatter={(v: number) => [`${entero(v)} ms`, 'Latencia']} />
              <Line type="linear" dataKey="valor" stroke={C.hueso} strokeWidth={2} dot={false} isAnimationActive={false} />
              {marcas.map((a) => (
                <ReferenceDot key={a.id} x={Math.max(desde, fecha(a.detectada_en).getTime())} y={a.valor_observado} r={5}
                  fill={C.senal} stroke="#1A1A1D" strokeWidth={2} ifOverflow="extendDomain" />
              ))}
              {ultimo && <ReferenceDot x={ultimo.t} y={ultimo.valor} r={5} fill={C.voltaje} stroke="rgba(212,255,0,.25)" strokeWidth={6} />}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function Minis({ datos }: { datos: Datos }) {
  const vals = (m: keyof Datos['minis']) => datos.minis[m].puntos.map((p) => p.valor);
  const ultimo = (a: number[]) => (a.length ? a[a.length - 1] : null);
  const errAbierta = datos.anomalias.some((a) => a.estado === 'ABIERTA' && a.servicio === 'api' && a.metrica === 'TASA_ERROR');
  const err = vals('TASA_ERROR').map((v) => v * 100);
  const cpu = vals('CPU_PCT');
  const cpuAhora = ultimo(cpu);
  const tarjetas = [
    { l: 'TASA DE ERROR', v: decimal(ultimo(err), 2), u: ' %', alerta: errAbierta, valores: err, min: 0, max: Math.max(3, ...err),
      trazo: errAbierta ? C.senal : C.hueso, relleno: errAbierta ? 'rgba(255,77,26,.12)' : 'rgba(242,240,235,.05)' },
    { l: 'PETICIONES / S', v: decimal(ultimo(vals('RPS')), 2), u: ' rps', alerta: false, valores: vals('RPS'), min: 0,
      trazo: C.voltaje, relleno: 'rgba(212,255,0,.08)' },
    { l: 'CPU DEL EQUIPO', v: entero(cpuAhora), u: ' %', alerta: false, valores: cpu, min: 0, max: 100,
      trazo: (cpuAhora ?? 0) > 70 ? C.advertencia : C.hueso, relleno: 'rgba(242,240,235,.05)' },
    { l: 'MEMORIA DEL EQUIPO', v: entero(ultimo(vals('MEM_PCT'))), u: ' %', alerta: false, valores: vals('MEM_PCT'), min: 0, max: 100,
      trazo: C.niebla, relleno: 'rgba(154,154,160,.08)' },
  ];
  return (
    <div className="grid grid-cols-2 gap-[10px]">
      {tarjetas.map((t) => (
        <div key={t.l} className={`flex min-w-0 flex-col gap-[6px] rounded border bg-concreto px-3 py-[10px] ${t.alerta ? 'border-senal' : 'border-grafito'}`}>
          <span className="etiqueta">{t.l}</span>
          <span className={`font-metrica text-[20px] font-bold leading-none cifra ${t.alerta ? 'text-senal' : 'text-hueso'}`}>
            {t.v}<span className="text-[11px] font-normal text-niebla">{t.u}</span>
          </span>
          <Sparkline valores={t.valores} min={t.min} max={t.max} trazo={t.trazo} relleno={t.relleno} />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- ciclo MAPE-K del último incidente
interface Paso { fase: Fase; hora: string; texto: string }

function pasosDe(an: Anomalia, acciones: AccionRemediacion[], estado: EstadoMonitor): Paso[] {
  const servicio = NOMBRE_SERVICIO[an.servicio] ?? an.servicio;
  const unidad = an.metrica === 'LATENCIA_MS' ? ' ms' : '';
  const valor = (v: number) => (an.metrica === 'TASA_ERROR' ? `${decimal(v * 100, 2)} %` : `${entero(v)}${unidad}`);
  const propias = acciones.filter((a) => a.anomalia_id === an.id).reverse(); // de la más vieja a la más nueva
  const pasos: Paso[] = [
    { fase: 'Monitor', hora: an.detectada_en, texto: `${NOMBRE_METRICA[an.metrica]} ${servicio} ${valor(an.valor_observado)} (media del último ciclo de ${estado.intervalo_seg} s)` },
    { fase: 'Analizar', hora: an.detectada_en, texto: `${decimal(an.zscore)}σ sobre la línea base (esperado ${valor(an.valor_esperado)}) · severidad ${an.severidad}` },
  ];
  const resuelta = an.resuelta_en ? fecha(an.resuelta_en).getTime() : Infinity;
  const antes = propias.filter((a) => fecha(a.ejecutada_en).getTime() <= resuelta && a.tipo !== 'ESCALAR_ABAJO');
  const despues = propias.filter((a) => !antes.includes(a));
  if (antes[0]) pasos.push({ fase: 'Planificar', hora: antes[0].ejecutada_en, texto: antes[0].detalle ?? antes[0].tipo });
  for (const a of antes) {
    if (a.tipo === 'NOTIFICAR_ADMIN') continue;
    pasos.push({ fase: 'Ejecutar', hora: a.ejecutada_en, texto: textoEjecucion(a) });
  }
  if (an.estado === 'MITIGADA' && an.resuelta_en) {
    pasos.push({ fase: 'Verificar', hora: an.resuelta_en, texto: 'El valor volvió a la banda de su línea base → MITIGADA ✓' });
  }
  for (const a of despues) pasos.push({ fase: 'Ejecutar', hora: a.ejecutada_en, texto: textoEjecucion(a) });
  return pasos;
}

function textoEjecucion(a: AccionRemediacion): string {
  switch (a.tipo) {
    case 'ESCALAR_ARRIBA':
      return `Réplica ${a.servicio}-${a.replicas_despues} levantada (${a.replicas_antes} → ${a.replicas_despues}) · balanceador actualizado`;
    case 'ESCALAR_ABAJO':
      return `Carga normal: ${a.servicio} vuelve de ${a.replicas_antes} a ${a.replicas_despues} réplicas`;
    case 'CAMBIAR_PROVEEDOR_IA':
      return 'La IA pasa a Mock mientras siga la anomalía (las 3 capas de seguridad siguen activas)';
    case 'REINICIAR_WORKER':
      return `Worker de ${a.servicio} reiniciado (simulado)`;
    default:
      return a.detalle ?? a.tipo;
  }
}

function LineaTiempo({ datos }: { datos: Datos }) {
  const an = datos.anomalias[0];
  const pasos = an ? pasosDe(an, datos.acciones, datos.estado) : [];
  const abierta = an?.estado === 'ABIERTA';
  const hechas = new Set(pasos.map((p) => p.fase));
  const actual = abierta ? pasos[pasos.length - 1]?.fase : null;
  const lb = base(datos.estado, 'api', 'LATENCIA_MS');
  const z = datos.estado.umbral_z;

  let estadoTexto = 'SIN INCIDENTES REGISTRADOS';
  let estadoColor = C.niebla;
  if (an && abierta) {
    estadoTexto = `INCIDENTE ABIERTO · ${duracion((Date.now() - fecha(an.detectada_en).getTime()) / 1000)}`;
    estadoColor = C.senal;
  } else if (an?.resuelta_en) {
    estadoTexto = `ÚLTIMO INCIDENTE · CERRADO EN ${duracion((fecha(an.resuelta_en).getTime() - fecha(an.detectada_en).getTime()) / 1000)}`.toUpperCase();
    estadoColor = C.exito;
  }

  return (
    <div className={`flex min-w-0 flex-col gap-3 rounded border bg-concreto p-[14px] ${abierta ? 'border-senal' : 'border-grafito'}`}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="titulo-panel">CICLO MAPE-K</span>
        <span className="font-metrica text-[12px] font-bold" style={{ color: estadoColor }}>{estadoTexto}</span>
      </div>
      <div className="grid grid-cols-5 gap-1">
        {FASES.map((f) => {
          const hecha = hechas.has(f);
          const color = hecha ? (f === actual ? COLOR_FASE[f] : abierta ? '#5A5A60' : C.exito) : !an && f === 'Monitor' ? C.hueso : C.grafito;
          return (
            <div key={f} className="flex flex-col gap-[6px]">
              <div className="h-[6px] transition-colors duration-300" style={{ background: color }} />
              <span className="text-[12px] font-bold" style={{ color: hecha || (!an && f === 'Monitor') ? C.hueso : '#5A5A60' }}>{f}</span>
            </div>
          );
        })}
      </div>
      {an ? (
        <ol className="flex flex-col">
          {pasos.map((p, i) => (
            <li key={i} className="grid animate-entrada-corta grid-cols-[76px_86px_minmax(0,1fr)] items-baseline gap-[10px] border-t border-grafito py-2">
              <span className="font-metrica text-[12px] text-niebla">{hora(p.hora)}</span>
              <span className="text-[12px] font-bold tracking-[.04em]" style={{ color: COLOR_FASE[p.fase] }}>{p.fase}</span>
              <span className="text-[13px]">{p.texto}</span>
            </li>
          ))}
          {abierta && (
            <li className="grid grid-cols-[76px_86px_minmax(0,1fr)] items-baseline gap-[10px] border-t border-grafito py-2 text-niebla">
              <span className="font-metrica text-[12px]">…</span>
              <span className="text-[12px] font-bold tracking-[.04em]">Verificar</span>
              <span className="text-[13px]">Esperando el siguiente ciclo del worker (cada {datos.estado.intervalo_seg} s)</span>
            </li>
          )}
        </ol>
      ) : (
        <p className="text-[13px] text-niebla">Monitor activo. Sin anomalías: el último incidente aparece aquí apenas ocurra. Prueba con «Simular pico de tráfico».</p>
      )}
      <div className="mt-auto rounded border border-grafito bg-asfalto p-[10px] font-metrica text-[12px] text-niebla">
        {lb ? (
          <>
            K · LÍNEA BASE API μ <span className="text-hueso">{entero(lb.media)} ms</span> · σ <span className="text-hueso">{decimal(lb.desviacion)} ms</span> ·
            μ+{decimal(z)}σ <span className="text-senal">{entero(lb.media + z * lb.desviacion)} ms</span> · {entero(lb.muestras)} MUESTRAS · {hora(lb.calculada_en)}
          </>
        ) : (
          'K · LÍNEA BASE API: aún no hay suficientes muestras (mínimo 10 en la ventana).'
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- bitácora
function Bitacora({ acciones }: { acciones: AccionRemediacion[] }) {
  return (
    <div className="panel flex min-w-0 flex-col gap-[10px] p-[14px]">
      <div className="flex items-baseline justify-between">
        <span className="titulo-panel">BITÁCORA DE REMEDIACIONES</span>
        <span className="font-metrica text-[12px] text-niebla">{acciones.length} EVENTOS</span>
      </div>
      {acciones.length === 0 ? (
        <p className="text-[13px] text-niebla">Todavía no hay remediaciones. Aparecerán aquí con su hora y su resultado.</p>
      ) : (
        <div className="max-h-[260px] overflow-auto">
          <table>
            <thead>
              <tr className="sticky top-0 bg-concreto">
                {['HORA', 'DETECCIÓN', 'ACCIÓN', 'RESULTADO'].map((h, i) => (
                  <th key={h} className={`etiqueta py-[6px] ${i === 0 ? 'pr-2 text-left' : i === 3 ? 'pl-2 text-right' : 'px-2 text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {acciones.map((a) => {
                const [tag, fondo, color] = ETIQUETA[a.tipo];
                const verificada = a.estado_anomalia === 'MITIGADA';
                return (
                  <tr key={a.id} className="animate-entrada-corta border-t border-grafito align-top">
                    <td className="whitespace-nowrap py-2 pr-2 font-metrica text-[12px] text-niebla">{hora(a.ejecutada_en)}</td>
                    <td className="p-2 text-[13px]">
                      {NOMBRE_METRICA[a.metrica]} {NOMBRE_SERVICIO[a.servicio] ?? a.servicio} {decimal(a.zscore)}σ
                    </td>
                    <td className="p-2 text-[13px]">
                      <span className="mr-[6px] whitespace-nowrap rounded-sm px-[5px] py-[2px] text-[11px] font-bold" style={{ background: fondo, color }}>{tag}</span>
                      {a.detalle}
                    </td>
                    <td className="whitespace-nowrap py-2 pl-2 text-right">
                      <span className={`text-[12px] font-bold ${verificada ? 'text-exito' : a.estado_anomalia === 'ABIERTA' ? 'text-advertencia' : 'text-niebla'}`}>
                        {verificada ? 'Verificado ✓' : a.estado_anomalia === 'ABIERTA' ? 'En curso' : a.resultado}
                      </span>
                      <span className="block font-metrica text-[11px] text-niebla">{a.severidad}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

