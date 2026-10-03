import { useMemo, useState } from 'react';
import { CLASIFICACIONES_IMC, type ClasificacionImc, type FilaUsoIa, type UsuarioAdmin } from '@fitia/shared';
import { admin } from '../api';
import { useDatos } from '../hooks/useDatos';
import { entero, hora, hoyLargo, pesos } from '../lib/formato';
import { useReloj } from '../shell/Cabecera';
import { useSalud } from '../shell/SaludContext';
import { Cargando, ErrorEstado } from '../ui/Estados';
import { Sparkline } from '../ui/Sparkline';

type Rango = 'Hoy' | '7 días' | '30 días';
const DIAS: Record<Rango, number> = { Hoy: 1, '7 días': 7, '30 días': 30 };
const DONA: [ClasificacionImc, string][] = [['BAJO_PESO', '#FFB020'], ['NORMAL', '#3DDC84'], ['SOBREPESO', '#D4FF00'], ['OBESIDAD', '#FF4D1A']];

const clave = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const diasAtras = (n: number) => Array.from({ length: n }, (_, i) => clave(new Date(Date.now() - (n - 1 - i) * 86_400_000)));

async function cargar() {
  const [usuarios, usoIa, ingresos, anomalias, acciones] = await Promise.all([
    admin.usuarios.listar(), admin.reportes.usoIa(), admin.reportes.ingresos(),
    admin.monitoreo.anomalias({ limite: 500 }), admin.monitoreo.acciones(8),
  ]);
  return { usuarios, usoIa, ingresos, anomalias, acciones };
}

export default function Resumen() {
  const { datos, cargando, error, recargar } = useDatos(cargar, []);
  const reloj = useReloj();
  const [rango, setRango] = useState<Rango>('Hoy');
  const [hover, setHover] = useState(2);
  const salud = useSalud();

  const k = useMemo(() => {
    if (!datos) return null;
    const n = DIAS[rango];
    const ventana = new Set(diasAtras(n));
    const ultimos14 = diasAtras(14);
    const personas = datos.usuarios.filter((u) => u.rol === 'USUARIO');
    const activos = personas.filter((u) => u.estado === 'ACTIVO');
    const porDia = (filtro: (f: FilaUsoIa) => number) => {
      const m = new Map<string, number>();
      datos.usoIa.filas.forEach((f) => m.set(f.dia.slice(0, 10), (m.get(f.dia.slice(0, 10)) ?? 0) + filtro(f)));
      return m;
    };
    const rutinas = porDia((f) => Number(f.exitosas));
    const enRango = datos.usoIa.filas.filter((f) => ventana.has(f.dia.slice(0, 10)));
    const solicitudes = enRango.reduce((s, f) => s + Number(f.solicitudes), 0);
    const exitosas = enRango.reduce((s, f) => s + Number(f.exitosas), 0);
    const rechazadas = enRango.reduce((s, f) => s + Number(f.rechazadas_por_seguridad), 0);
    const tokens = enRango.reduce((s, f) => s + Number(f.tokens_entrada ?? 0) + Number(f.tokens_salida ?? 0), 0);
    const porProveedor = enRango.reduce<Record<string, number>>((m, f) => ({ ...m, [f.proveedor]: (m[f.proveedor] ?? 0) + Number(f.solicitudes) }), {});
    const mes = clave(new Date()).slice(0, 7);
    const ingresosMes = datos.ingresos.filas.filter((f) => f.mes === mes);
    const meses = [...new Set(datos.ingresos.filas.map((f) => f.mes))].sort().slice(-7);
    const anomPorDia = new Map<string, number>();
    datos.anomalias.forEach((a) => anomPorDia.set(a.detectada_en.slice(0, 10), (anomPorDia.get(a.detectada_en.slice(0, 10)) ?? 0) + 1));
    const altas = (u: UsuarioAdmin) => clave(new Date(u.creado_en));
    return {
      activos: activos.length,
      altasRango: personas.filter((u) => ventana.has(altas(u))).length,
      altasSpark: diasAtras(7).map((d) => personas.filter((u) => altas(u) <= d).length),
      rutinasRango: [...ventana].reduce((s, d) => s + (rutinas.get(d) ?? 0), 0),
      rutinas14: ultimos14.map((d) => ({ d, v: rutinas.get(d) ?? 0 })),
      ingresosMes: ingresosMes.reduce((s, f) => s + Number(f.total_cop), 0),
      pagosMes: ingresosMes.reduce((s, f) => s + Number(f.pagos_aprobados), 0),
      ingresosSpark: meses.map((m) => datos.ingresos.filas.filter((f) => f.mes === m).reduce((s, f) => s + Number(f.total_cop), 0)),
      anomRango: [...ventana].reduce((s, d) => s + (anomPorDia.get(d) ?? 0), 0),
      anomSpark: diasAtras(7).map((d) => anomPorDia.get(d) ?? 0),
      abiertas: datos.anomalias.filter((a) => a.estado === 'ABIERTA').length,
      solicitudes, exitosas, rechazadas, errores: Math.max(0, solicitudes - exitosas - rechazadas), tokens, porProveedor,
      dona: DONA.map(([c, color]) => ({ c, color, n: personas.filter((u) => u.clasificacion_imc === c).length })),
      conImc: personas.filter((u) => u.clasificacion_imc).length,
    };
  }, [datos, rango]);

  return (
    <div className="flex animate-entrada flex-col gap-[14px]">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="kicker">{hoyLargo()} · {reloj}</div>
          <h1 className="titulo-pagina">Resumen</h1>
        </div>
        <div role="group" aria-label="Rango" className="flex overflow-hidden rounded border border-grafito">
          {(Object.keys(DIAS) as Rango[]).map((r) => (
            <button key={r} type="button" onClick={() => setRango(r)} aria-pressed={rango === r}
              className={`min-h-[34px] px-3 font-metrica text-[12px] font-bold ${rango === r ? 'bg-voltaje text-asfalto' : 'text-hueso'}`}>{r.toUpperCase()}</button>
          ))}
        </div>
      </header>

      {cargando && !datos ? <Cargando /> : error || !k ? <ErrorEstado error={error} reintentar={recargar} /> : (
        <>
          <div className="grid grid-cols-4 gap-[10px]">
            <Kpi l="USUARIOS ACTIVOS" v={entero(k.activos)} d={`+${entero(k.altasRango)} nuevos ${rango === 'Hoy' ? 'hoy' : `en ${rango}`}`} dc="text-exito" valores={k.altasSpark} />
            <Kpi l="RUTINAS GENERADAS" v={entero(k.rutinasRango)} c="text-voltaje" d={`${rango === 'Hoy' ? 'hoy' : `en ${rango}`} · validadas por seguridad`} valores={k.rutinas14.slice(-7).map((x) => x.v)} trazo="#D4FF00" />
            <Kpi l="INGRESOS DEL MES (SIM.)" v={pesos(k.ingresosMes)} d={`${entero(k.pagosMes)} pagos aprobados`} valores={k.ingresosSpark} />
            <Kpi l={rango === 'Hoy' ? 'ANOMALÍAS HOY' : `ANOMALÍAS · ${rango.toUpperCase()}`} v={entero(k.anomRango)} c={k.abiertas ? 'text-senal' : undefined}
              d={k.abiertas ? `${k.abiertas} ${k.abiertas === 1 ? 'incidente abierto' : 'incidentes abiertos'}` : 'Todas resueltas'} dc={k.abiertas ? 'text-senal' : 'text-exito'}
              valores={k.anomSpark} trazo={k.abiertas ? '#FF4D1A' : '#9A9AA0'} />
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.1fr)] gap-[10px]">
            <div className="panel flex flex-col gap-3 p-[14px]">
              <div className="flex items-baseline justify-between">
                <span className="titulo-panel">USO DE IA · {rango.toUpperCase()}</span>
                <span className="rounded-sm border border-voltaje px-[6px] py-[3px] text-[11px] font-bold text-voltaje">
                  {salud?.datos?.estado.ia.efectivo === 'gemini' ? 'GEMINI' : 'MOCK'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-px border border-grafito bg-grafito">
                <Cifra v={entero(k.solicitudes)} l="SOLICITUDES" />
                <Cifra v={k.tokens ? entero(k.tokens) : '—'} l="TOKENS" />
                <Cifra v="$0" l="COSTO (GRATIS)" c="text-voltaje" />
              </div>
              <div className="flex flex-col gap-2">
                {[['Rutinas válidas', k.exitosas, '#D4FF00'], ['Rechazadas por el validador', k.rechazadas, '#F2F0EB'], ['Errores del proveedor', k.errores, '#FF4D1A'],
                  ...Object.entries(k.porProveedor).map(([p, v]) => [`Proveedor ${p === 'gemini' ? 'Gemini' : 'Mock'}`, v, '#9A9AA0'] as const)].map(([l, v, color]) => (
                  <div key={l} className="flex flex-col gap-1">
                    <div className="flex justify-between text-[13px]"><span>{l}</span><span className="font-metrica text-niebla">{entero(Number(v))}</span></div>
                    <div className="h-[6px] bg-grafito"><div className="h-full" style={{ width: `${k.solicitudes ? (Number(v) / k.solicitudes) * 100 : 0}%`, background: color }} /></div>
                  </div>
                ))}
              </div>
              <span className="text-[12px] text-niebla">Capa gratuita: si el proveedor falla o se acaba la cuota, pasa a Mock.</span>
            </div>

            <div className="panel flex flex-col gap-3 p-[14px]">
              <span className="titulo-panel">USUARIOS POR IMC</span>
              {k.conImc ? (
                <div className="flex items-center gap-4">
                  <Dona partes={k.dona} total={k.conImc} hover={hover} setHover={setHover} />
                  <ul className="flex flex-1 flex-col gap-[6px]">
                    {k.dona.map((p, i) => (
                      <li key={p.c} onMouseEnter={() => setHover(i)} className={`flex items-center gap-2 rounded-sm px-[6px] py-1 text-[13px] ${hover === i ? 'bg-rejilla' : ''}`}>
                        <span className="h-[10px] w-[10px]" style={{ background: p.color }} />
                        <span className="flex-1">{CLASIFICACIONES_IMC[p.c]}</span>
                        <span className="font-metrica font-bold">{Math.round((p.n / k.conImc) * 100)}%</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : <p className="text-[13px] text-niebla">Nadie ha registrado su peso todavía.</p>}
              <span className="text-[12px] text-niebla">{entero(k.conImc)} usuarios con IMC registrado.</span>
            </div>

            <div className="panel flex flex-col gap-[10px] p-[14px]">
              <div className="flex items-baseline justify-between">
                <span className="titulo-panel">RUTINAS GENERADAS POR DÍA</span>
                <span className="font-metrica text-[12px] text-niebla">14 DÍAS</span>
              </div>
              <div className="flex min-h-[140px] flex-1 items-end gap-1 border-b border-grafito">
                {k.rutinas14.map((x, i) => {
                  const max = Math.max(1, ...k.rutinas14.map((y) => y.v));
                  return <div key={x.d} title={`${x.d} · ${x.v} rutinas`} className="flex-1" style={{ height: `${Math.max(2, (x.v / max) * 100)}%`, background: i === 13 ? '#D4FF00' : '#5A5A60' }} />;
                })}
              </div>
              <div className="flex justify-between font-metrica text-[11px] text-niebla"><span>−13 D</span><span>−7 D</span><span>HOY</span></div>
            </div>
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-[10px]">
            <Plataforma />
            <div className="panel flex flex-col gap-[6px] p-[14px]">
              <span className="titulo-panel mb-1">ACTIVIDAD RECIENTE DEL MONITOR</span>
              {datos!.acciones.length ? datos!.acciones.slice(0, 5).map((a) => (
                <div key={a.id} className="grid grid-cols-[64px_10px_minmax(0,1fr)] items-center gap-[10px] border-t border-grafito py-[5px] text-[13px]">
                  <span className="font-metrica text-[12px] text-niebla">{hora(a.ejecutada_en).slice(0, 5)}</span>
                  <span className="h-2 w-2" style={{ background: a.tipo === 'ESCALAR_ARRIBA' ? '#D4FF00' : a.tipo === 'NOTIFICAR_ADMIN' ? '#FF4D1A' : a.tipo === 'CAMBIAR_PROVEEDOR_IA' ? '#FFB020' : '#3DDC84' }} />
                  <span className="truncate">{a.detalle}</span>
                </div>
              )) : <p className="text-[13px] text-niebla">Sin remediaciones registradas.</p>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Kpi({ l, v, d, c, dc = 'text-niebla', valores, trazo = '#F2F0EB' }: {
  l: string; v: string; d: string; c?: string; dc?: string; valores: number[]; trazo?: string;
}) {
  return (
    <div className="panel relative flex flex-col gap-[6px] overflow-hidden p-[14px]">
      <span className="etiqueta">{l}</span>
      <span className={`truncate font-metrica text-[30px] font-bold leading-none tracking-[-.03em] cifra ${c ?? 'text-hueso'}`}>{v}</span>
      <span className={`truncate font-metrica text-[12px] font-bold ${dc}`}>{d}</span>
      <Sparkline valores={valores} trazo={trazo} relleno={null} alto={28} />
    </div>
  );
}

function Cifra({ v, l, c = '' }: { v: string; l: string; c?: string }) {
  return (
    <div className="bg-concreto p-[10px]">
      <div className={`truncate font-metrica text-[22px] font-bold ${c}`}>{v}</div>
      <div className="text-[11px] font-bold text-niebla">{l}</div>
    </div>
  );
}

function Dona({ partes, total, hover, setHover }: {
  partes: { c: ClasificacionImc; color: string; n: number }[]; total: number; hover: number; setHover: (i: number) => void;
}) {
  let acumulado = 0;
  const actual = partes[hover];
  return (
    <div className="relative h-[150px] w-[150px] flex-none">
      <svg viewBox="0 0 42 42" className="h-full w-full -rotate-90" role="img" aria-label="Usuarios por clasificación de IMC">
        <circle cx="21" cy="21" r="15.915" fill="none" stroke="#2A2A2E" strokeWidth="6" />
        {partes.map((p, i) => {
          const pct = (p.n / total) * 100;
          const el = (
            <circle key={p.c} cx="21" cy="21" r="15.915" fill="none" stroke={p.color} strokeWidth={hover === i ? 8 : 6}
              strokeDasharray={`${pct} ${100 - pct}`} strokeDashoffset={-acumulado} onMouseEnter={() => setHover(i)}
              className="cursor-pointer transition-[stroke-width] duration-150" />
          );
          acumulado += pct;
          return el;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-metrica text-[24px] font-bold leading-none">{entero(actual.n)}</span>
        <span className="text-[11px] font-bold text-niebla">{CLASIFICACIONES_IMC[actual.c].toUpperCase()}</span>
      </div>
    </div>
  );
}

function Plataforma() {
  const salud = useSalud();
  const servicios = salud?.datos?.servicios ?? [];
  const mal = servicios.some((s) => s.estado !== 'SALUDABLE');
  return (
    <button type="button" onClick={() => { window.location.hash = '#/monitoreo'; }}
      className={`flex flex-col gap-[10px] rounded border bg-concreto p-[14px] text-left text-hueso hover:border-hueso ${mal ? 'border-senal' : 'border-grafito'}`}>
      <span className="flex w-full justify-between">
        <span className="titulo-panel">SALUD DE LA PLATAFORMA</span>
        <span className="text-[13px] font-bold text-voltaje">Monitoreo ›</span>
      </span>
      <span className="grid w-full grid-cols-4 gap-[6px]">
        {(servicios.length ? servicios : [{ codigo: '…', estado: 'SALUDABLE' as const }]).map((s) => {
          const ok = s.estado === 'SALUDABLE';
          return (
            <span key={s.codigo} className={`flex flex-col gap-[2px] rounded-sm border p-2 ${ok ? 'border-grafito' : 'border-senal'}`}>
              <span className="text-[12px] font-bold uppercase">{s.codigo === 'db' ? 'BD' : s.codigo}</span>
              <span className={`text-[11px] font-bold ${ok ? 'text-exito' : 'text-senal'}`}>● {ok ? 'OK' : 'DEGRADADO'}</span>
            </span>
          );
        })}
      </span>
    </button>
  );
}
