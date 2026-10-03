/** Mini gráfica de línea con área (SVG a mano, como el diseño). */
export function Sparkline({
  valores, min, max, trazo = '#F2F0EB', relleno = 'rgba(242,240,235,.05)', alto = 52,
}: { valores: number[]; min?: number; max?: number; trazo?: string; relleno?: string | null; alto?: number }) {
  if (valores.length < 2) {
    return <div style={{ height: alto }} className="flex items-center text-[11px] text-humo">Sin datos aún</div>;
  }
  const mn = min ?? Math.min(...valores);
  const mx = max ?? Math.max(...valores);
  const rango = mx - mn || 1;
  const n = valores.length;
  const pts = valores.map((v, i) => [(i / (n - 1)) * 100, 40 - ((Math.min(mx, Math.max(mn, v)) - mn) / rango) * 38 - 1]);
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`).join(' ');
  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" style={{ width: '100%', height: alto, overflow: 'visible' }} aria-hidden="true">
      {relleno && <path d={`${d} L100 40 L0 40 Z`} fill={relleno} />}
      <path d={d} fill="none" stroke={trazo} strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
