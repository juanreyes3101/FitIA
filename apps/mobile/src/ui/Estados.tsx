import { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { ApiError } from '@fitia/shared';
import { c } from '../tema';
import { Boton } from './Boton';
import { Cuerpo, Titulo } from './Texto';

/** Cuadrado que gira (fitia-spin del diseño). */
export function Giro({ tam = 52, color = c.voltaje }: { tam?: number; color?: string }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.loop(Animated.timing(v, { toValue: 1, duration: 800, easing: Easing.linear, useNativeDriver: true }));
    a.start();
    return () => a.stop();
  }, [v]);
  const rotate = v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <Animated.View
      accessibilityLabel="Cargando"
      style={{ width: tam, height: tam, borderWidth: 4, borderColor: color, borderRightColor: 'transparent', transform: [{ rotate }] }}
    />
  );
}

export function Cargando({ texto = 'Cargando…' }: { texto?: string }) {
  return (
    <View style={{ flex: 1, minHeight: 280, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <Giro />
      <Titulo tam={26}>{texto}</Titulo>
    </View>
  );
}

export function Vacio({ titulo, texto, accion, onAccion }: { titulo: string; texto: string; accion?: string; onAccion?: () => void }) {
  return (
    <View style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: c.grafito, borderRadius: 4, padding: 20, gap: 12 }}>
      <Titulo tam={32}>{titulo}</Titulo>
      <Cuerpo color={c.niebla}>{texto}</Cuerpo>
      {accion && onAccion ? (
        <Boton onPress={onAccion} display alto={56}>
          {accion}
        </Boton>
      ) : null}
    </View>
  );
}

export const mensajeError = (e: unknown) =>
  e instanceof ApiError ? e.message : 'Ocurrió un error inesperado. Intenta de nuevo.';

export function ErrorEstado({ error, onReintentar }: { error: unknown; onReintentar: () => void }) {
  return (
    <View style={{ borderWidth: 2, borderColor: c.error, borderRadius: 4, padding: 20, gap: 12 }}>
      <Titulo tam={32} color={c.error}>Algo falló</Titulo>
      <Cuerpo>{mensajeError(error)}</Cuerpo>
      <Boton variante="secundario" onPress={onReintentar}>
        Reintentar
      </Boton>
    </View>
  );
}
