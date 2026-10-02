import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Anton_400Regular } from '@expo-google-fonts/anton/400Regular';
import { InterTight_400Regular } from '@expo-google-fonts/inter-tight/400Regular';
import { InterTight_500Medium } from '@expo-google-fonts/inter-tight/500Medium';
import { InterTight_600SemiBold } from '@expo-google-fonts/inter-tight/600SemiBold';
import { InterTight_700Bold } from '@expo-google-fonts/inter-tight/700Bold';
import { JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono/400Regular';
import { JetBrainsMono_700Bold } from '@expo-google-fonts/jetbrains-mono/700Bold';
import { SesionProvider, useSesion } from '@/sesion/SesionContext';
import { ToastProvider } from '@/ui/Toast';
import { PlanesProvider } from '@/planes/HojaPlanes';
import { Bienvenida } from '@/ui/Bienvenida';
import { SinConexion } from '@/ui/SinConexion';
import { c } from '@/tema';

SplashScreen.preventAutoHideAsync().catch(() => {});

function Navegacion() {
  const { estado } = useSesion();
  const dentro = estado === 'autenticado';
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.asfalto }, animation: 'fade_from_bottom' }}>
      <Stack.Protected guard={!dentro}>
        <Stack.Screen name="ingresar" />
      </Stack.Protected>
      <Stack.Protected guard={dentro}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
        <Stack.Screen name="entreno" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
        <Stack.Screen name="ejercicio/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="imc" options={{ animation: 'slide_from_right' }} />
      </Stack.Protected>
    </Stack>
  );
}

function Raiz() {
  const { estado } = useSesion();
  // La bienvenida (splash Voltaje del diseño) dura mientras se restaura la sesión, mínimo 1,2 s
  const [bienvenida, setBienvenida] = useState(true);
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
    const t = setTimeout(() => setBienvenida(false), 1200);
    return () => clearTimeout(t);
  }, []);

  if (estado === 'sinConexion') return <SinConexion />;
  return (
    <View style={{ flex: 1, backgroundColor: c.asfalto }}>
      {estado !== 'cargando' ? <Navegacion /> : null}
      {bienvenida || estado === 'cargando' ? <Bienvenida /> : null}
    </View>
  );
}

export default function Layout() {
  const [fuentes] = useFonts({
    Anton_400Regular,
    InterTight_400Regular,
    InterTight_500Medium,
    InterTight_600SemiBold,
    InterTight_700Bold,
    JetBrainsMono_400Regular,
    JetBrainsMono_700Bold,
  });
  if (!fuentes) return null; // el splash nativo sigue visible mientras cargan

  return (
    <SafeAreaProvider style={{ backgroundColor: c.asfalto }}>
      <StatusBar style="light" />
      <SesionProvider>
        <ToastProvider>
          <PlanesProvider>
            <Raiz />
          </PlanesProvider>
        </ToastProvider>
      </SesionProvider>
    </SafeAreaProvider>
  );
}
