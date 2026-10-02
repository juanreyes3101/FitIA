// Tokens de diseño para React Native. Los colores salen de packages/shared (una sola fuente);
// aquí solo se traducen las fuentes a las familias cargadas con expo-font (en RN, el peso es otra familia).
import { colores, sombras } from '@fitia/shared';

export const c = colores;

export const F = {
  titulo: 'Anton_400Regular', // siempre en MAYÚSCULAS
  texto: 'InterTight_400Regular',
  medio: 'InterTight_500Medium',
  semi: 'InterTight_600SemiBold',
  negrita: 'InterTight_700Bold',
  mono: 'JetBrainsMono_400Regular',
  monoNegrita: 'JetBrainsMono_700Bold',
} as const;

/** Colores del diseño móvil que no están en la paleta base */
export const extra = {
  superficie: '#141416', // tab bar y hojas inferiores
  apagado: '#5A5A60',
  verdeSombra: '#1F7A47',
  numeroFondo: '#212125',
} as const;

/** Sombra "golpe" (0 4 0 VoltajeSombra) en versión RN: un borde inferior sólido sin desenfoque. */
export const golpe = { sombra: colores.voltajeSombra, alto: 5 } as const;

/** La letra grande del sistema no debe romper las rejillas de cifras ni los títulos display. */
export const MAX_ESCALA = 1.3;

export { sombras };
