import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { F, MAX_ESCALA, c } from '../tema';
import { Cuerpo, Titulo } from './Texto';

type Variante = 'primario' | 'oscuro' | 'verde' | 'secundario' | 'contorno' | 'fantasma' | 'peligro';

interface Props {
  children: ReactNode;
  onPress?: () => void;
  variante?: Variante;
  /** Alto mínimo (el diseño usa 52–84 px en la app) */
  alto?: number;
  /** Texto en Anton mayúsculas (CTA grandes) o Inter Tight negrita */
  display?: boolean;
  tam?: number;
  icono?: ReactNode;
  cargando?: boolean;
  deshabilitado?: boolean;
  /** Se ve apagado pero sigue respondiendo (p. ej. para explicar qué falta) */
  inactivo?: boolean;
  etiquetaAccesible?: string;
  style?: StyleProp<ViewStyle>;
}

const ESTILO: Record<Variante, { bg: string; fg: string; borde?: string; sombra?: string }> = {
  primario: { bg: c.voltaje, fg: c.asfalto, sombra: c.voltajeSombra },
  oscuro: { bg: c.asfalto, fg: c.voltaje, sombra: c.voltajeOscuro },
  verde: { bg: c.exito, fg: c.asfalto, sombra: '#1F7A47' },
  peligro: { bg: c.error, fg: c.asfalto },
  secundario: { bg: 'transparent', fg: c.hueso, borde: c.hueso },
  contorno: { bg: 'transparent', fg: c.voltaje, borde: c.voltaje },
  fantasma: { bg: 'transparent', fg: c.niebla },
};

/**
 * Botón del sistema de diseño. Los que tienen sombra "golpe" (0 5 0) bajan 3 px al presionarlos
 * y la sombra queda en 2 px: el alto total no cambia, así que nada salta alrededor.
 */
export function Boton({
  children, onPress, variante = 'primario', alto = 56, display = false, tam, icono, cargando, deshabilitado, inactivo, etiquetaAccesible, style,
}: Props) {
  const e = ESTILO[variante];
  const bloqueado = deshabilitado || cargando;
  const apagado = bloqueado || inactivo;
  const bg = apagado && e.sombra ? c.grafito : e.bg;
  const fg = apagado && e.sombra ? c.niebla : apagado ? c.humo : e.fg;
  const sombra = apagado ? c.concreto : e.sombra;
  const contenido =
    typeof children === 'string' ? (
      display ? (
        <Titulo tam={tam ?? 26} color={fg} lineas={1} style={{ textAlign: 'center' }}>
          {children}
        </Titulo>
      ) : (
        <Cuerpo tam={tam ?? 16} peso="negrita" color={fg} style={{ textAlign: 'center' }}>
          {children}
        </Cuerpo>
      )
    ) : (
      children
    );

  return (
    <Pressable
      onPress={bloqueado ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={etiquetaAccesible}
      accessibilityState={{ disabled: !!bloqueado, busy: !!cargando }}
      style={style}
    >
      {({ pressed }) => {
        const abajo = pressed && !apagado;
        const cuerpo = (
          <View
            style={{
              minHeight: alto,
              borderRadius: 4,
              backgroundColor: bg,
              borderWidth: e.borde ? 2 : 0,
              borderColor: apagado ? c.grafito : e.borde,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              paddingHorizontal: 16,
              opacity: !sombra && abajo ? 0.75 : 1,
              transform: [{ translateY: !sombra && abajo ? 2 : 0 }],
            }}
          >
            {cargando ? <ActivityIndicator color={fg} /> : icono}
            {contenido}
          </View>
        );
        if (!sombra) return cuerpo;
        return (
          <View style={{ borderRadius: 4, backgroundColor: sombra, marginTop: abajo ? 3 : 0, paddingBottom: abajo ? 2 : 5 }}>{cuerpo}</View>
        );
      }}
    </Pressable>
  );
}

/** Enlace de texto subrayado (p. ej. "Ver los 5 ejercicios"). */
export function Enlace({ children, onPress, color = c.voltaje }: { children: string; onPress: () => void; color?: string }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="link" style={{ minHeight: 44, justifyContent: 'center', alignItems: 'center' }}>
      <Text maxFontSizeMultiplier={MAX_ESCALA} style={{ fontFamily: F.negrita, fontSize: 16, color, textDecorationLine: 'underline' }}>
        {children}
      </Text>
    </Pressable>
  );
}
