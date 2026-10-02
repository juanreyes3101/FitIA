// Gráficas del diseño móvil (FitiaMovProgreso), dibujadas con react-native-svg: línea con área y
// barras con la línea de meta punteada. "Toca y desliza" para leer cada punto, con un toque háptico.
import { useMemo, useRef, useState } from 'react';
import { PanResponder, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Line, Path, Rect } from 'react-native-svg';
import { c, extra } from '../tema';
import { toque } from '../lib/vibracion';

export interface Punto {
  /** 0–1 en el eje X */
  x: number;
  v: number;
}

export function Grafica({
  tipo, puntos, alto = 200, meta, escalaMax, onSeleccion,
}: {
  tipo: 'linea' | 'barras';
  puntos: Punto[];
  alto?: number;
  /** Barras: valor de la meta (línea punteada) */
  meta?: number;
  /** Barras: valor máximo del eje Y */
  escalaMax?: number;
  /** null = sin selección (se muestra el último punto) */
  onSeleccion: (i: number | null) => void;
}) {
  const [ancho, setAncho] = useState(0);
  const [sel, setSel] = useState<number | null>(null);
  const selRef = useRef<number | null>(null);

  const [min, max] = useMemo(() => {
    if (tipo === 'barras') return [0, escalaMax ?? Math.max(1, ...puntos.map((p) => p.v))];
    const vs = puntos.map((p) => p.v);
    const lo = Math.min(...vs);
    const hi = Math.max(...vs);
    const pad = Math.max((hi - lo) * 0.2, 0.5);
    return [lo - pad, hi + pad];
  }, [puntos, tipo, escalaMax]);
  const Y = (v: number) => alto - ((v - min) / (max - min || 1)) * alto;
  const X = (x: number) => x * ancho;

  const elegir = (px: number) => {
    if (!ancho || !puntos.length) return;
    const x = px / ancho;
    let mejor = 0;
    puntos.forEach((p, i) => {
      if (Math.abs(p.x - x) < Math.abs(puntos[mejor].x - x)) mejor = i;
    });
    if (mejor !== selRef.current) {
      selRef.current = mejor;
      setSel(mejor);
      onSeleccion(mejor);
      toque();
    }
  };
  const soltar = () => {
    selRef.current = null;
    setSel(null);
    onSeleccion(null);
  };
  const elegirRef = useRef(elegir);
  elegirRef.current = elegir;
  const soltarRef = useRef(soltar);
  soltarRef.current = soltar;
  const gesto = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e) => elegirRef.current(e.nativeEvent.locationX),
        onPanResponderMove: (e) => elegirRef.current(e.nativeEvent.locationX),
        onPanResponderRelease: () => soltarRef.current(),
        onPanResponderTerminate: () => soltarRef.current(),
      }),
    [],
  );

  const activo = sel ?? puntos.length - 1;
  const p = puntos[activo];
  const linea = puntos.map((q, i) => `${i ? 'L' : 'M'}${X(q.x).toFixed(1)} ${Y(q.v).toFixed(1)}`).join(' ');
  const anchoBarra = puntos.length ? Math.max(4, ancho / puntos.length - 5) : 0;

  return (
    <View
      onLayout={(e: LayoutChangeEvent) => setAncho(e.nativeEvent.layout.width)}
      style={{ height: alto }}
      accessibilityRole="image"
      accessibilityLabel="Gráfica. Toca y desliza para ver cada punto."
      {...gesto.panHandlers}
    >
      {ancho > 0 && puntos.length ? (
        <Svg width={ancho} height={alto} pointerEvents="none">
          {tipo === 'linea' ? (
            <>
              <Path d={`${linea} L${X(puntos[puntos.length - 1].x)} ${alto} L${X(puntos[0].x)} ${alto} Z`} fill="rgba(212,255,0,0.08)" />
              <Path d={linea} fill="none" stroke={c.voltaje} strokeWidth={3} />
            </>
          ) : (
            <>
              {meta != null ? <Line x1={0} x2={ancho} y1={Y(meta)} y2={Y(meta)} stroke={c.voltaje} strokeWidth={1} strokeDasharray="4 4" /> : null}
              {puntos.map((q, i) => (
                <Rect
                  key={i}
                  x={X(q.x) - anchoBarra / 2}
                  y={Y(q.v)}
                  width={anchoBarra}
                  height={Math.max(0, alto - Y(q.v))}
                  fill={i === sel ? c.hueso : meta != null && q.v >= meta ? c.voltaje : extra.apagado}
                />
              ))}
            </>
          )}
          {sel != null ? <Line x1={X(p.x)} x2={X(p.x)} y1={0} y2={alto} stroke={c.hueso} strokeOpacity={0.5} strokeWidth={2} /> : null}
          {tipo === 'linea' && p ? <Rect x={Math.min(Math.max(X(p.x), 8), ancho - 8) - 8} y={Y(p.v) - 8} width={16} height={16} fill={c.asfalto} stroke={c.voltaje} strokeWidth={3} /> : null}
        </Svg>
      ) : null}
    </View>
  );
}
