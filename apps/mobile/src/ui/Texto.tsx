import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';
import { F, MAX_ESCALA, c } from '../tema';

type Props = TextProps & { color?: string; tam?: number; style?: TextStyle | TextStyle[] };

/**
 * Título Anton, siempre en mayúsculas. El interlineado nunca baja de 0,95 × el tamaño: con menos,
 * Android y la web recortan las tildes de las mayúsculas (DÍA → DIA). Los títulos largos (nombres de ejercicio) se encogen para
 * caber en vez de desbordar: adjustsFontSizeToFit con un número de líneas máximo.
 */
export function Titulo({ tam = 44, color = c.hueso, style, lineas, children, ...p }: Props & { lineas?: number }) {
  // Hueco para las tildes de las mayúsculas (Í, Á, Ñ): relleno arriba y el mismo margen negativo,
  // así la caja del texto las contiene (nada las recorta) y el título no se mueve de su sitio.
  const tilde = Math.round(tam * 0.14);
  // Con tildes o Ñ, las líneas se separan un poco más: si no, el acento choca con la línea de arriba
  const texto = Array.isArray(children) ? children.join('') : typeof children === 'string' ? children : '';
  const interlineado = /[ÁÉÍÓÚÑÜáéíóúñü]/.test(texto) ? 1.08 : 0.95;
  const propio = (StyleSheet.flatten(style) || {}) as TextStyle;
  return (
    <Text
      maxFontSizeMultiplier={MAX_ESCALA}
      numberOfLines={lineas}
      adjustsFontSizeToFit={!!lineas}
      minimumFontScale={0.55}
      {...p}
      style={[
        { fontFamily: F.titulo, fontSize: tam, lineHeight: Math.round(tam * interlineado), color, textTransform: 'uppercase', flexShrink: 1 },
        propio,
        { paddingTop: tilde + (Number(propio.paddingTop) || 0), marginTop: (Number(propio.marginTop) || 0) - tilde },
      ]}
    >
      {children}
    </Text>
  );
}

/** Rótulo en JetBrains Mono (fechas, "RACHA", "SIGUIENTE"…). */
export function Etiqueta({ tam = 12, color = c.niebla, style, ...p }: Props) {
  return (
    <Text
      maxFontSizeMultiplier={MAX_ESCALA}
      {...p}
      style={[{ fontFamily: F.monoNegrita, fontSize: tam, letterSpacing: tam * 0.06, color, flexShrink: 1 }, style as TextStyle]}
    />
  );
}

/** Cifra tabular grande (IMC, cronómetro, repeticiones). */
export function Metrica({ tam = 28, color = c.hueso, style, ...p }: Props) {
  return (
    <Text
      maxFontSizeMultiplier={MAX_ESCALA}
      numberOfLines={1}
      adjustsFontSizeToFit
      {...p}
      style={[
        { fontFamily: F.monoNegrita, fontSize: tam, lineHeight: Math.round(tam * 1.2), color, letterSpacing: -tam * 0.04, fontVariant: ['tabular-nums'] },
        style as TextStyle,
      ]}
    />
  );
}

/** Texto de interfaz en Inter Tight. peso: texto | medio | semi | negrita */
export function Cuerpo({ tam = 16, color = c.hueso, peso = 'texto', style, ...p }: Props & { peso?: 'texto' | 'medio' | 'semi' | 'negrita' }) {
  return (
    <Text
      maxFontSizeMultiplier={1.6}
      {...p}
      style={[{ fontFamily: F[peso], fontSize: tam, lineHeight: Math.round(tam * 1.4), color, flexShrink: 1 }, style as TextStyle]}
    />
  );
}
