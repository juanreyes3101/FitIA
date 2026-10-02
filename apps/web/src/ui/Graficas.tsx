// Gráficas con Recharts en el lenguaje de FitIA: una serie por gráfica (sin leyenda; el título la nombra),
// grilla recesiva en Grafito, ejes en Niebla, cifras en JetBrains Mono y tooltip al pasar el mouse.
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ReferenceArea, ReferenceLine, ResponsiveContainer,
  Tooltip, XAxis, YAxis, type TooltipProps,
} from 'recharts';
import { colores } from '@fitia/shared';
import { formatoNumero } from '@fitia/shared';

const EJE = { fill: colores.niebla, fontSize: 11, fontFamily: 'JetBrains Mono, monospace' };

function Globo({ active, payload, label, unidad, decimales }: TooltipProps<number, string> & { unidad: string; decimales: number }) {
  if (!active || !payload?.length) return null;
  const v = payload[0].value as number;
  return (
    <div className="rounded border border-grafito bg-asfalto px-3 py-2 shadow-flotante">
      <div className="font-metrica text-[11px] text-niebla">{label}</div>
      <div className="font-metrica text-[15px] font-bold text-hueso">
        {formatoNumero(v, decimales)} {unidad}
      </div>
    </div>
  );
}

export interface PuntoSerie {
  x: string;
  y: number;
}

/** Línea de tiempo (peso, IMC). `bandas` pinta rangos de referencia muy tenues detrás de la línea. */
export function GraficaLinea({
  datos,
  unidad,
  decimales = 1,
  alto = 200,
  dominio,
  bandas = [],
  etiqueta,
}: {
  datos: PuntoSerie[];
  unidad: string;
  decimales?: number;
  alto?: number;
  dominio?: [number, number];
  bandas?: { desde: number; hasta: number; color: string; texto: string }[];
  etiqueta: string;
}) {
  const ys = datos.map((d) => d.y);
  const min = dominio?.[0] ?? Math.floor(Math.min(...ys) - 1);
  const max = dominio?.[1] ?? Math.ceil(Math.max(...ys) + 1);
  return (
    <div role="img" aria-label={etiqueta} style={{ height: alto }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={datos} margin={{ top: 12, right: 12, bottom: 0, left: -12 }}>
          {bandas.map((b) => (
            <ReferenceArea key={b.texto} y1={Math.max(b.desde, min)} y2={Math.min(b.hasta, max)} fill={b.color} fillOpacity={0.07} ifOverflow="hidden" />
          ))}
          <CartesianGrid stroke={colores.grafito} strokeDasharray="3 4" vertical={false} />
          <XAxis dataKey="x" tick={EJE} tickLine={false} axisLine={{ stroke: colores.grafito }} minTickGap={24} />
          <YAxis domain={[min, max]} tick={EJE} tickLine={false} axisLine={false} width={44} tickFormatter={(v) => formatoNumero(v, 0)} />
          <Tooltip content={<Globo unidad={unidad} decimales={decimales} />} cursor={{ stroke: colores.niebla, strokeDasharray: '3 3' }} />
          <Line
            type="linear"
            dataKey="y"
            stroke={colores.voltaje}
            strokeWidth={2}
            dot={{ r: 4, fill: colores.asfalto, stroke: colores.voltaje, strokeWidth: 2 }}
            activeDot={{ r: 6, fill: colores.voltaje, stroke: colores.asfalto, strokeWidth: 2 }}
            isAnimationActive
            animationDuration={600}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Barras por semana (sesiones o dolor) con una línea de referencia (meta o alerta). */
export function GraficaBarras({
  datos,
  unidad,
  decimales = 0,
  alto = 200,
  referencia,
  colorBarra,
  max,
  etiqueta,
}: {
  datos: PuntoSerie[];
  unidad: string;
  decimales?: number;
  alto?: number;
  referencia?: { y: number; texto: string; color?: string };
  colorBarra?: (y: number) => string;
  max?: number;
  etiqueta: string;
}) {
  return (
    <div role="img" aria-label={etiqueta} style={{ height: alto }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={datos} margin={{ top: 16, right: 12, bottom: 0, left: -12 }} barCategoryGap={4}>
          <CartesianGrid stroke={colores.grafito} strokeDasharray="3 4" vertical={false} />
          <XAxis dataKey="x" tick={EJE} tickLine={false} axisLine={{ stroke: colores.grafito, strokeWidth: 2 }} />
          <YAxis domain={[0, max ?? 'auto']} allowDecimals={decimales > 0} tick={EJE} tickLine={false} axisLine={false} width={44} />
          <Tooltip content={<Globo unidad={unidad} decimales={decimales} />} cursor={{ fill: 'rgba(242,240,235,.04)' }} />
          {referencia && (
            <ReferenceLine
              y={referencia.y}
              stroke={referencia.color ?? colores.niebla}
              strokeDasharray="4 4"
              label={{ value: referencia.texto, position: 'insideTopRight', fill: referencia.color ?? colores.niebla, fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
            />
          )}
          <Bar dataKey="y" radius={[2, 2, 0, 0]} maxBarSize={48} animationDuration={600}>
            {datos.map((d, i) => (
              <Cell key={i} fill={colorBarra ? colorBarra(d.y) : colores.voltaje} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Etiqueta de semana corta a partir de YEARWEEK: 202639 → "S39" */
export const etiquetaSemana = (semanaIso: number) => `S${String(semanaIso).slice(4)}`;

/** Color del dolor según la escala del diseño: ≤3 verde, ≤5 ámbar, >5 Señal. */
export const colorDolor = (n: number) => (n <= 3 ? colores.exito : n <= 5 ? colores.advertencia : colores.senal);
