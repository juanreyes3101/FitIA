import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSesion } from '../sesion/SesionContext';
import { API_URL } from '../api';
import { c } from '../tema';
import { Boton } from './Boton';
import { Cuerpo, Etiqueta, Titulo } from './Texto';

/** Hay sesión guardada pero la API no responde: no se borra la sesión, se explica cómo conectarse. */
export function SinConexion() {
  const { reintentar, logout } = useSesion();
  const ins = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: c.asfalto, paddingTop: ins.top + 24, paddingBottom: ins.bottom + 16, paddingHorizontal: 16, gap: 16 }}>
      <View aria-hidden style={{ height: 14, marginHorizontal: -16, flexDirection: 'row', overflow: 'hidden' }}>
        {Array.from({ length: 40 }, (_, i) => (
          <View key={i} style={{ width: 12, height: 14, backgroundColor: i % 2 ? c.asfalto : c.senal }} />
        ))}
      </View>
      <Titulo tam={52}>Sin conexión con FitIA</Titulo>
      <Cuerpo>No pudimos hablar con el servidor. Revisa que el celular esté en la misma WiFi que la PC y que la API esté encendida.</Cuerpo>
      <View style={{ padding: 12, borderWidth: 1, borderColor: c.grafito, borderRadius: 4, gap: 4 }}>
        <Etiqueta>DIRECCIÓN DE LA API</Etiqueta>
        <Cuerpo tam={15} peso="semi" selectable>{API_URL}</Cuerpo>
      </View>
      <View style={{ flex: 1 }} />
      <Boton display alto={64} onPress={reintentar}>REINTENTAR</Boton>
      <Boton variante="fantasma" onPress={() => void logout()}>Cerrar sesión</Boton>
    </View>
  );
}
