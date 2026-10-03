import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { NombreReporte } from '@fitia/shared';
import { admin } from '../api';
import { useDatos } from '../hooks/useDatos';
import { guardarCsv } from '../lib/csv';
import { decimal, entero, pesos } from '../lib/formato';
import { Boton } from '../ui/Boton';
import { Cargando, ErrorEstado, mensajeError } from '../ui/Estados';
import { useToast } from '../ui/Toasts';

const C = { hueso: '#F2F0EB', niebla: '#9A9AA0', voltaje: '#D4FF00', tenue: '#5A5A60', grafito: '#2A2A2E', rejilla: '#232327' };
const EJE = { stroke: C.niebla, tick: { fontSize: 11, fontFamily: 'JetBrains Mono' }, tickLine: false, axisLine: false } as const;
const TIP = { contentStyle: { background: '#141416', border: `1px solid ${C.grafito}`, borderRadius: 4, fontSize: 12 }, cursor: { fill: 'rgba(242,240,235,.04)' } };
const NOMBRES: Record<NombreReporte, string> = { ingresos: 'Ingresos', 'uso-ia': 'Uso de IA', adherencia: 'Adherencia' };
const MESES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
const mesCorto = (m: string) => `${MESES[Number(m.slice(5, 7)) - 1]} ${m.slice(2, 4)}`;
const semanaCorta = (s: number) => `S${String(s).slice(4)}`;

async function cargar() {
  const [ingresos, usoIa, adherencia] = await Promise.all([admin.reportes.ingresos(), admin.reportes.usoIa(), admin.reportes.adherencia()]);
  return { ingresos, usoIa, adherencia };
}

export default function Reportes() {
  const avisar = useToast();
  const { datos, cargando, error, recargar } = useDatos(cargar, []);
  const [tabla, setTabla] = useState<NombreReporte>('ingresos');
  const [exportando, setExportando] = useState(false);

  const g = useMemo(() => {
    if (!datos) return null;
    const planes = [...new Set(datos.ingresos.filas.map((f) => f.plan))];
    const ingresos = [...new Set(datos.ingresos.filas.map((f) => f.mes))].sort().map((mes) => ({
      mes: mesCorto(mes),
      ...Object.fromEntries(planes.map((p) => [p, datos.ingresos.filas.filter((f) => f.mes === mes && f.plan === p).reduce((s, f) => s + Number(f.total_cop), 0)])),
    }));
    const semanas = [...new Set(datos.adherencia.filas.map((f) => f.semana_iso))].sort();
    const adherencia = semanas.map((s) => {
      const filas = datos.adherencia.filas.filter((f) => f.semana_iso === s);
      const ses = filas.reduce((a, f) => a + Number(f.sesiones), 0);
      const comp = filas.reduce((a, f) => a + Number(f.completadas), 0);
      return { semana: semanaCorta(s), completadas: ses ? Math.round((comp / ses) * 100) : 0, usuarios: filas.length };
    });
    const dias = [...new Set(datos.usoIa.filas.map((f) => f.dia.slice(0, 10)))].sort().slice(-30);
    const ia = dias.map((d) => {
      const filas = datos.usoIa.filas.filter((f) => f.dia.slice(0, 10) === d);
      const suma = (p: string) => filas.filter((f) => f.proveedor === p).reduce((s, f) => s + Number(f.solicitudes), 0);
      return { dia: d.slice(5).split('-').reverse().join('/'), Gemini: suma('gemini'), Mock: suma('mock') };
    });
    return { planes, ingresos, adherencia, ia };
  }, [datos]);

  async function exportar() {
    setExportando(true);
    try {
      const csv = await admin.reportes.csv(tabla);
      const ruta = await guardarCsv(`reporte_${tabla}.csv`, csv);
      if (ruta) avisar('ok', 'CSV exportado', ruta);
    } catch (e) {
      avisar('err', 'No se pudo exportar', mensajeError(e));
    } finally {
      setExportando(false);
    }
  }

  const filas = (datos
    ? tabla === 'ingresos' ? datos.ingresos.filas : tabla === 'uso-ia' ? datos.usoIa.filas : datos.adherencia.filas
    : []) as unknown as Record<string, unknown>[];
  const columnas = filas[0] ? Object.keys(filas[0]) : [];
  const resumen = datos?.adherencia.resumen;

  return (
    <div className="flex animate-entrada flex-col gap-[14px]">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="kicker">PANDAS → JSON O CSV · PAGOS SIMULADOS</div>
          <h1 className="titulo-pagina">Reportes</h1>
        </div>
        <Boton onClick={() => void exportar()} disabled={!datos || exportando}>{exportando ? 'Exportando…' : `Exportar CSV · ${NOMBRES[tabla]}`}</Boton>
      </header>

      {cargando && !datos ? <Cargando /> : error || !datos || !g ? <ErrorEstado error={error} reintentar={recargar} /> : (
        <>
          <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-[10px]">
            <div className="panel flex flex-col gap-3 p-[14px]">
              <div className="flex items-baseline justify-between">
                <span className="titulo-panel">INGRESOS POR MES</span>
                <span className="font-metrica text-[12px] text-niebla">TOTAL <strong className="text-voltaje">{pesos(datos.ingresos.resumen.total_cop)}</strong></span>
              </div>
              <div className="h-[230px]">
                {g.ingresos.length ? (
                  <ResponsiveContainer>
                    <BarChart data={g.ingresos} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke={C.rejilla} vertical={false} />
                      <XAxis dataKey="mes" {...EJE} />
                      <YAxis {...EJE} width={64} tickFormatter={(v: number) => `$${entero(v / 1000)}k`} />
                      <Tooltip {...TIP} formatter={(v: number, n: string) => [pesos(v), n]} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      {g.planes.map((p, i) => <Bar key={p} dataKey={p} stackId="a" fill={i === 0 ? C.voltaje : C.hueso} isAnimationActive={false} />)}
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-[13px] text-niebla">Aún no hay pagos aprobados.</p>}
              </div>
            </div>
            <div className="flex flex-col gap-[10px]">
              <div className="panel flex flex-col gap-2 p-[14px]">
                <div className="flex items-baseline justify-between">
                  <span className="titulo-panel">ADHERENCIA</span>
                  <span className="font-metrica text-[18px] font-bold text-voltaje">{resumen?.tasa_completadas != null ? `${decimal(resumen.tasa_completadas * 100, 0)} %` : '—'}</span>
                </div>
                <div className="h-[110px]">
                  <ResponsiveContainer>
                    <LineChart data={g.adherencia} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
                      <XAxis dataKey="semana" {...EJE} />
                      <YAxis {...EJE} width={32} domain={[0, 100]} ticks={[0, 60, 100]} />
                      <ReferenceLine y={60} stroke={C.grafito} strokeDasharray="3 3" />
                      <Tooltip {...TIP} formatter={(v: number) => [`${v} %`, 'Sesiones completadas']} />
                      <Line dataKey="completadas" stroke={C.voltaje} strokeWidth={2} dot={false} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <span className="text-[12px] text-niebla">% de sesiones completadas por semana · línea punteada: meta 60 % · dolor promedio {resumen?.dolor_promedio != null ? decimal(resumen.dolor_promedio) : '—'}/10.</span>
              </div>
              <div className="panel flex flex-col gap-2 p-[14px]">
                <div className="flex items-baseline justify-between">
                  <span className="titulo-panel">USO DE IA</span>
                  <span className="font-metrica text-[12px] text-niebla">{entero(datos.usoIa.resumen.solicitudes)} SOLICITUDES · $0</span>
                </div>
                <div className="h-[110px]">
                  <ResponsiveContainer>
                    <BarChart data={g.ia} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
                      <XAxis dataKey="dia" {...EJE} />
                      <YAxis {...EJE} width={32} allowDecimals={false} />
                      <Tooltip {...TIP} />
                      <Bar dataKey="Gemini" stackId="ia" fill={C.hueso} isAnimationActive={false} />
                      <Bar dataKey="Mock" stackId="ia" fill={C.tenue} isAnimationActive={false} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <span className="text-[12px] text-niebla">Barra clara: solicitudes a Gemini · gris: Mock (pruebas y respaldo).</span>
              </div>
            </div>
          </div>

          <div className="panel flex flex-col gap-2 p-[14px]">
            <div role="tablist" className="flex gap-1">
              {(Object.keys(NOMBRES) as NombreReporte[]).map((n) => (
                <button key={n} type="button" role="tab" aria-selected={tabla === n} onClick={() => setTabla(n)}
                  className={`min-h-[32px] rounded px-3 text-[13px] font-bold ${tabla === n ? 'bg-hueso text-asfalto' : 'text-niebla hover:text-hueso'}`}>{NOMBRES[n]}</button>
              ))}
            </div>
            <div className="max-h-[320px] overflow-auto">
              <table>
                <thead>
                  <tr className="sticky top-0 bg-concreto">
                    {columnas.map((c) => <th key={c} className="etiqueta whitespace-nowrap px-2 py-[6px] text-left">{c.replace(/_/g, ' ').toUpperCase()}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {filas.map((f, i) => (
                    <tr key={i} className="border-t border-grafito">
                      {columnas.map((c) => (
                        <td key={c} className={`whitespace-nowrap px-2 py-[6px] text-[13px] ${typeof f[c] === 'number' ? 'text-right font-metrica' : ''}`}>
                          {f[c] == null ? '—' : typeof f[c] === 'number' ? decimal(f[c] as number, Number.isInteger(f[c]) ? 0 : 2) : String(f[c]).slice(0, 10)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {!filas.length && <p className="p-4 text-center text-[13px] text-niebla">Este reporte todavía no tiene filas.</p>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
