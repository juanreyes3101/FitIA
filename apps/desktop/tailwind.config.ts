import type { Config } from 'tailwindcss';
import { colores, fuentes, espaciado, radios, sombras, movimiento } from '../../packages/shared/src/tokens';

// Mismos tokens de @fitia/shared que la web y el móvil, más los tonos de consola del diseño de escritorio.
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
        senal: { DEFAULT: colores.senal, sombra: '#8A2A0E' },
        exito: colores.exito,
        advertencia: colores.advertencia,
        error: colores.error,
        // Consola (docs/diseno/escritorio): fila al pasar, rejilla de gráficas y bordes apagados
        fila: '#202024',
        rejilla: '#232327',
        apagado: '#3A3A40',
        tenue: '#5A5A60',
        plata: '#C8C8CC',
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
        'golpe-chico': `0 3px 0 ${colores.voltajeSombra}`,
        senal: '0 4px 0 #8A2A0E',
        'senal-2': '0 2px 0 #8A2A0E',
        flotante: '0 24px 48px -12px rgba(0,0,0,.9)',
      },
      transitionTimingFunction: { fitia: movimiento.curva },
      keyframes: {
        entrada: { from: { opacity: '0', transform: 'translate3d(-16px,12px,0)' }, to: { opacity: '1', transform: 'none' } },
        pulso: { '0%,100%': { opacity: '1' }, '50%': { opacity: '.3' } },
        ping: { '0%': { transform: 'scale(1)', opacity: '.8' }, '100%': { transform: 'scale(2.6)', opacity: '0' } },
        temblor: { '0%,100%': { transform: 'none' }, '25%': { transform: 'translateX(-6px)' }, '75%': { transform: 'translateX(6px)' } },
      },
      animation: {
        entrada: `entrada 300ms ${movimiento.curva} both`,
        'entrada-corta': `entrada 220ms ${movimiento.curva} both`,
        pulso: 'pulso 1.4s infinite',
        ping: 'ping 1.6s infinite',
        temblor: 'temblor 200ms',
      },
    },
  },
  plugins: [],
} satisfies Config;
