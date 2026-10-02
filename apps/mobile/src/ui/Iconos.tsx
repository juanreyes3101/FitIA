// Íconos del diseño (rutas SVG copiadas de docs/diseno/movil). Trazo cuadrado, sin redondeos.
import Svg, { Path } from 'react-native-svg';

export const RUTAS = {
  hoy: 'M13 2L4 14h7l-1 8 9-12h-7z',
  rutina: 'M6 7v10M3 9v6M18 7v10M21 9v6M6 12h12',
  progreso: 'M3 20h18M4 16l5-5 4 3 7-7M15 7h5v5',
  lumbar: 'M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z',
  perfil: 'M8 4h8v8H8zM4 21l2-5h12l2 5',
  ia: 'M12 3l2 7 7 2-7 2-2 7-2-7-7-2 7-2z',
  check: 'M4 12l5 5L20 6',
  cerrar: 'M6 6l12 12M18 6L6 18',
  alerta: 'M12 3l10 18H2zM12 10v5M12 18v1',
  atras: 'M15 6l-6 6 6 6',
  adelante: 'M9 6l6 6-6 6',
  vibrar: 'M8 4h8v16H8zM4 8v8M20 8v8',
} as const;

export type NombreIcono = keyof typeof RUTAS;

export function Icono({ nombre, tam = 24, color = 'currentColor', grosor = 2 }: { nombre: NombreIcono; tam?: number; color?: string; grosor?: number }) {
  return (
    <Svg width={tam} height={tam} viewBox="0 0 24 24" fill="none">
      <Path d={RUTAS[nombre]} stroke={color} strokeWidth={grosor} strokeLinecap="square" />
    </Svg>
  );
}

/** Íconos rellenos: play y pausa */
export function Play({ tam = 24, color }: { tam?: number; color: string }) {
  return (
    <Svg width={tam} height={tam} viewBox="0 0 24 24">
      <Path d="M7 4l13 8-13 8z" fill={color} />
    </Svg>
  );
}

export function Pausa({ tam = 22, color }: { tam?: number; color: string }) {
  return (
    <Svg width={tam} height={tam} viewBox="0 0 24 24">
      <Path d="M6 4h4v16H6zM14 4h4v16h-4z" fill={color} />
    </Svg>
  );
}

/** Logo de FitIA (mancuerna + pulso + chispa), del splash del diseño. */
export function Logo({ ancho = 48, color }: { ancho?: number; color: string }) {
  return (
    <Svg width={ancho} height={(ancho * 36) / 48} viewBox="0 0 48 36">
      <Path d="M2 12h6v24H2zM8 17h4v14H8zM40 12h6v24h-6zM36 17h4v14h-4z" fill={color} />
      <Path d="M43 0l1.4 3.6L48 5l-3.6 1.4L43 10l-1.4-3.6L38 5l3.6-1.4z" fill={color} />
      <Path d="M12 24h5l3-8 5 16 3-10 2 2h6" fill="none" stroke={color} strokeWidth={3} strokeLinecap="square" />
    </Svg>
  );
}
