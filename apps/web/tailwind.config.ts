import type { Config } from 'tailwindcss';
import { colores, fuentes, espaciado, radios, sombras, movimiento } from '../../packages/shared/src/tokens';

// Tailwind usa los tokens de @fitia/shared: un solo sistema de diseño para web, móvil y escritorio.
const px = (o: Record<string | number, number>) =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [k, `${v}px`]));

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        asfalto: colores.asfalto,
        concreto: colores.concreto,
        carbon: colores.carbon,
        grafito: colores.grafito,
        niebla: colores.niebla,
        humo: colores.humo,
        hueso: colores.hueso,
        yeso: colores.yeso,
        voltaje: { DEFAULT: colores.voltaje, hover: colores.voltajeHover, sombra: colores.voltajeSombra, oscuro: colores.voltajeOscuro },
        senal: colores.senal,
        exito: colores.exito,
        advertencia: colores.advertencia,
        error: colores.error,
      },
      fontFamily: {
        titulo: fuentes.titulo.split(', '),
        texto: fuentes.texto.split(', '),
        metrica: fuentes.metrica.split(', '),
      },
      spacing: Object.fromEntries(Object.entries(espaciado).map(([k, v]) => [`e${k}`, `${v}px`])),
      borderRadius: { none: '0', sm: px(radios)[1], DEFAULT: px(radios)[2], md: px(radios)[2] },
      boxShadow: {
        golpe: sombras.golpe,
        'golpe-2': sombras.golpePresionado,
        bloque: sombras.bloque,
        'bloque-voltaje': sombras.bloqueVoltaje,
        flotante: sombras.flotante,
        foco: sombras.foco,
      },
      transitionTimingFunction: { fitia: movimiento.curva },
      transitionDuration: { golpe: `${movimiento.golpe}ms`, arranque: `${movimiento.arranque}ms`, conteo: `${movimiento.conteo}ms` },
      keyframes: {
        marquesina: { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
        entrada: { from: { opacity: '0', transform: 'translate3d(-24px,20px,0)' }, to: { opacity: '1', transform: 'none' } },
        pulso: { '0%,100%': { opacity: '1' }, '50%': { opacity: '.35' } },
        llenar: { from: { transform: 'scaleX(0)' }, to: { transform: 'scaleX(1)' } },
      },
      animation: {
        marquesina: 'marquesina 28s linear infinite',
        entrada: `entrada 600ms ${movimiento.curva} both`,
        pulso: 'pulso 1.2s ease-in-out infinite',
        llenar: `llenar 600ms ${movimiento.curva} both`,
      },
    },
  },
  plugins: [],
} satisfies Config;
