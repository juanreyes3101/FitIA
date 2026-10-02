// Tokens de diseño de FitIA (docs/diseno/comun/FitIA Marca.dc.html · sistema de diseño v1.0).
// "El oscuro manda. El Voltaje es escaso a propósito: si todo brilla, nada brilla."

export const colores = {
  asfalto: '#0B0B0C', // fondo principal
  concreto: '#1A1A1D', // tarjetas y superficies
  carbon: '#141416', // superficie hundida (campos)
  grafito: '#2A2A2E', // bordes y divisores · nunca texto
  niebla: '#9A9AA0', // texto secundario
  humo: '#5C5C62', // texto terciario / deshabilitado
  hueso: '#F2F0EB', // texto principal
  yeso: '#D9D6CF',
  voltaje: '#D4FF00', // CTA, progreso, dato clave
  voltajeHover: '#E1FF4D',
  voltajeSombra: '#7E9900',
  voltajeOscuro: '#3A4700',
  senal: '#FF4D1A', // alertas, intensidad, en vivo
  exito: '#3DDC84',
  advertencia: '#FFB020',
  error: '#FF3B3B',
} as const;

export const fuentes = {
  titulo: "Anton, 'Arial Narrow', sans-serif", // siempre en MAYÚSCULAS, interlineado 0.88–0.95
  texto: "'Inter Tight', system-ui, sans-serif",
  metrica: "'JetBrains Mono', ui-monospace, monospace", // cifras tabulares
} as const;

/** [tamaño px, interlineado] */
export const tipografia = {
  display: [120, 0.88],
  h1: [72, 0.92],
  h2: [48, 0.95],
  h3: [32, 1],
  h4: [24, 1],
  textoL: [20, 1.45],
  base: [16, 1.5],
  pequeno: [14, 1.45],
  etiqueta: [13, 1.2],
} as const;

/** Escala de 4 px: esp-1 … esp-32 */
export const espaciado = {
  1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 11: 44, 12: 48, 13: 52, 16: 64, 20: 80, 24: 96, 32: 128,
} as const;

/** No hay radio mayor a 4: nada de píldoras. */
export const radios = { 0: 0, 1: 2, 2: 4 } as const;

export const sombras = {
  golpe: `0 4px 0 ${colores.voltajeSombra}`,
  golpePresionado: `0 2px 0 ${colores.voltajeSombra}`,
  bloque: `4px 4px 0 ${colores.grafito}`,
  bloqueVoltaje: `4px 4px 0 ${colores.voltaje}`,
  flotante: '0 24px 48px -12px rgba(0,0,0,.8)',
  foco: `0 0 0 2px ${colores.asfalto}, 0 0 0 4px ${colores.voltaje}`,
} as const;

export const movimiento = {
  curva: 'cubic-bezier(.2,.8,.2,1)',
  golpe: 90,
  arranque: 600,
  conteo: 900,
} as const;

/** Área táctil mínima y alto de botón de app */
export const tactil = { minimo: 44, botonApp: 52 } as const;

export const tokens = { colores, fuentes, tipografia, espaciado, radios, sombras, movimiento, tactil };
export default tokens;
