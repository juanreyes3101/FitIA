import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Dimensions, KeyboardAvoidingView, Modal, PanResponder, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { c, extra } from '../tema';

/**
 * Hoja inferior del diseño: borde superior Voltaje, máximo 92 % del alto, se cierra tocando el fondo
 * o arrastrando la manija hacia abajo más de 60 px. Sin librerías extra (Modal + Animated + PanResponder).
 */
export function HojaInferior({
  visible, onCerrar, children, etiqueta, colorBorde = c.voltaje,
}: {
  visible: boolean;
  onCerrar: () => void;
  children: ReactNode;
  etiqueta: string;
  colorBorde?: string;
}) {
  const ins = useSafeAreaInsets();
  const alto = Dimensions.get('window').height;
  const y = useRef(new Animated.Value(alto)).current;

  useEffect(() => {
    if (visible) {
      y.setValue(alto);
      Animated.timing(y, { toValue: 0, duration: 320, useNativeDriver: true }).start();
    }
  }, [visible, alto, y]);

  const onCerrarRef = useRef(onCerrar);
  onCerrarRef.current = onCerrar;
  const arrastre = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 6,
      onPanResponderMove: (_, g) => y.setValue(Math.max(0, g.dy)),
      onPanResponderRelease: (_, g) => {
        if (g.dy > 60) onCerrarRef.current();
        else Animated.spring(y, { toValue: 0, useNativeDriver: true }).start();
      },
    }),
  ).current;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCerrar} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable accessibilityLabel="Cerrar" onPress={onCerrar} style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,.6)' }} />
        <Animated.View
          accessibilityViewIsModal
          accessibilityLabel={etiqueta}
          style={{
            maxHeight: '92%',
            backgroundColor: extra.superficie,
            borderTopWidth: 2,
            borderTopColor: colorBorde,
            borderTopLeftRadius: 4,
            borderTopRightRadius: 4,
            transform: [{ translateY: y }],
          }}
        >
          <View {...arrastre.panHandlers} style={{ paddingTop: 10, paddingBottom: 6, alignItems: 'center' }}>
            <View style={{ width: 44, height: 5, backgroundColor: extra.apagado, borderRadius: 2 }} />
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 20 + ins.bottom, gap: 14 }}>
            {children}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
