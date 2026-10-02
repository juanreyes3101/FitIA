import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { c } from '../tema';
import { Logo } from './Iconos';
import { Etiqueta, Titulo } from './Texto';

/** Splash del diseño: fondo Voltaje, logo, "FITIA", "ENTRENA CON CALLE" y la cinta de obra a −7°. */
export function Bienvenida() {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }, [v]);
  return (
    <Animated.View
      accessibilityLabel="FitIA"
      style={{
        position: 'absolute', top: 0, bottom: 0, left: 0, right: 0,
        backgroundColor: c.voltaje, alignItems: 'center', justifyContent: 'center', gap: 18,
        overflow: 'hidden', opacity: v,
      }}
    >
      <Logo ancho={120} color={c.asfalto} />
      <Titulo tam={88} color={c.asfalto} style={{ lineHeight: 80 }}>FITIA</Titulo>
      <Etiqueta tam={13} color={c.asfalto} style={{ letterSpacing: 1 }}>ENTRENA CON CALLE</Etiqueta>
      {/* Cinta de obra: más ancha que la pantalla, pero el padre recorta (overflow hidden) */}
      <View
        aria-hidden
        style={{
          position: 'absolute', left: '-10%', right: '-10%', bottom: 80, height: 22, flexDirection: 'row',
          overflow: 'hidden', transform: [{ rotate: '-7deg' }],
        }}
      >
        {Array.from({ length: 40 }, (_, i) => (
          <View key={i} style={{ width: 14, height: 22, backgroundColor: i % 2 ? c.voltaje : c.asfalto, transform: [{ skewX: '-45deg' }] }} />
        ))}
      </View>
    </Animated.View>
  );
}
