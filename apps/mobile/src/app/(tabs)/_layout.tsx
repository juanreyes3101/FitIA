import { Pressable, Text, View } from 'react-native';
import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { F, c, extra } from '@/tema';
import { toque } from '@/lib/vibracion';
import { Icono, type NombreIcono } from '@/ui/Iconos';

const TABS: { nombre: string; etiqueta: string; icono: NombreIcono }[] = [
  { nombre: 'index', etiqueta: 'Hoy', icono: 'hoy' },
  { nombre: 'rutina', etiqueta: 'Rutina', icono: 'rutina' },
  { nombre: 'progreso', etiqueta: 'Progreso', icono: 'progreso' },
  { nombre: 'lumbar', etiqueta: 'Lumbar', icono: 'lumbar' },
  { nombre: 'perfil', etiqueta: 'Perfil', icono: 'perfil' },
];

/** Tab bar del diseño: 68 px + la barra de gestos, pastilla Voltaje de 52 × 32 en la pestaña activa. */
function BarraTabs({ state, navigation }: BottomTabBarProps) {
  const ins = useSafeAreaInsets();
  return (
    <View
      accessibilityRole="tablist"
      style={{ flexDirection: 'row', height: 68 + ins.bottom, paddingBottom: ins.bottom, backgroundColor: extra.superficie, borderTopWidth: 1, borderTopColor: c.grafito }}
    >
      {state.routes.map((r, i) => {
        const t = TABS.find((x) => x.nombre === r.name);
        if (!t) return null;
        const on = state.index === i;
        return (
          <Pressable
            key={r.key}
            accessibilityRole="tab"
            accessibilityLabel={t.etiqueta}
            accessibilityState={{ selected: on }}
            onPress={() => {
              const ev = navigation.emit({ type: 'tabPress', target: r.key, canPreventDefault: true });
              if (!on && !ev.defaultPrevented) {
                toque();
                navigation.navigate(r.name);
              }
            }}
            style={({ pressed }) => ({
              flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center', gap: 4,
              transform: [{ translateY: pressed ? 2 : 0 }],
            })}
          >
            <View style={{ width: 52, height: 32, borderRadius: 4, backgroundColor: on ? c.voltaje : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
              <Icono nombre={t.icono} color={on ? c.asfalto : c.niebla} />
            </View>
            <Text
              numberOfLines={1}
              maxFontSizeMultiplier={1.15}
              style={{ fontFamily: F.negrita, fontSize: 12, letterSpacing: 0.24, color: on ? c.hueso : c.niebla }}
            >
              {t.etiqueta}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function LayoutTabs() {
  return (
    <Tabs tabBar={(p) => <BarraTabs {...p} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: c.asfalto } }}>
      {TABS.map((t) => (
        <Tabs.Screen key={t.nombre} name={t.nombre} options={{ title: t.etiqueta }} />
      ))}
    </Tabs>
  );
}
