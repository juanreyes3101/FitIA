import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Animated, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { c } from '../tema';
import { Icono, type NombreIcono } from './Iconos';
import { Cuerpo } from './Texto';

type Tipo = 'ok' | 'warn' | 'err' | 'ia';
const TIPOS: Record<Tipo, [string, NombreIcono]> = {
  ok: [c.exito, 'check'],
  warn: [c.advertencia, 'alerta'],
  err: [c.error, 'cerrar'],
  ia: [c.voltaje, 'ia'],
};

interface ToastItem {
  id: number;
  tipo: Tipo;
  titulo: string;
  mensaje?: string;
  anim: Animated.Value;
}

type Avisar = (tipo: Tipo, titulo: string, mensaje?: string) => void;
const Ctx = createContext<Avisar>(() => {});
export const useToast = () => useContext(Ctx);

/** Toasts del diseño: franja de color con ícono a la izquierda, máximo 2 a la vez, 3,8 s. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const ins = useSafeAreaInsets();
  const n = useRef(0);

  const avisar = useCallback<Avisar>((tipo, titulo, mensaje) => {
    const id = ++n.current;
    const anim = new Animated.Value(0);
    setItems((t) => [...t.slice(-1), { id, tipo, titulo, mensaje, anim }]);
    Animated.timing(anim, { toValue: 1, duration: 240, useNativeDriver: true }).start();
    setTimeout(() => setItems((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  return (
    <Ctx.Provider value={avisar}>
      {children}
      <View
        pointerEvents="none"
        accessibilityLiveRegion="polite"
        style={{ position: 'absolute', left: 12, right: 12, bottom: ins.bottom + 84, gap: 8 }}
      >
        {items.map((t) => {
          const [bg, icono] = TIPOS[t.tipo];
          return (
            <Animated.View
              key={t.id}
              accessibilityRole="alert"
              style={{
                flexDirection: 'row',
                backgroundColor: c.concreto,
                borderWidth: 1,
                borderColor: c.grafito,
                borderRadius: 4,
                overflow: 'hidden',
                opacity: t.anim,
                transform: [{ translateY: t.anim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
              }}
            >
              <View style={{ width: 52, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
                <Icono nombre={icono} tam={22} color={c.asfalto} />
              </View>
              <View style={{ flex: 1, minWidth: 0, paddingVertical: 12, paddingHorizontal: 14 }}>
                <Cuerpo peso="negrita">{t.titulo}</Cuerpo>
                {t.mensaje ? <Cuerpo tam={15} color={c.niebla}>{t.mensaje}</Cuerpo> : null}
              </View>
            </Animated.View>
          );
        })}
      </View>
    </Ctx.Provider>
  );
}
