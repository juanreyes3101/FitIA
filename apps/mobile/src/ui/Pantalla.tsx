import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, View, type ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { c } from '../tema';

/**
 * Contenedor de cada pantalla: respeta el notch (safe area superior), fondo Asfalto, márgenes de 16 px
 * y gap de 12–14 px como en el diseño. overflow hidden en X: ningún adorno (números gigantes, cintas)
 * puede crear scroll horizontal.
 */
export function Pantalla({
  children, gap = 14, padding = 16, scroll = true, onRefrescar, refrescando = false, fondo = c.asfalto, ...p
}: {
  children: ReactNode;
  gap?: number;
  padding?: number;
  scroll?: boolean;
  onRefrescar?: () => void;
  refrescando?: boolean;
  fondo?: string;
} & ScrollViewProps) {
  const ins = useSafeAreaInsets();
  const estilo = { paddingTop: ins.top + 12, paddingHorizontal: padding, paddingBottom: 24, gap };
  if (!scroll) return <View style={[{ flex: 1, backgroundColor: fondo, overflow: 'hidden' }, estilo]}>{children}</View>;
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: fondo }}>
      <ScrollView
        style={{ flex: 1, overflow: 'hidden' }}
        contentContainerStyle={estilo}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefrescar ? (
            <RefreshControl refreshing={refrescando} onRefresh={onRefrescar} tintColor={c.voltaje} colors={[c.asfalto]} progressBackgroundColor={c.voltaje} progressViewOffset={ins.top} />
          ) : undefined
        }
        {...p}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
