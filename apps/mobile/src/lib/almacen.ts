// Almacén clave-valor: expo-secure-store en el celular (Keychain / Keystore cifrado).
// En la vista web de Expo (solo se usa para la revisión de desbordes) secure-store no existe,
// así que allí se cae a localStorage.
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const web = Platform.OS === 'web';

export async function leer(clave: string): Promise<string | null> {
  try {
    return web ? localStorage.getItem(clave) : await SecureStore.getItemAsync(clave);
  } catch {
    return null;
  }
}

export async function guardar(clave: string, valor: string): Promise<void> {
  try {
    if (web) localStorage.setItem(clave, valor);
    else await SecureStore.setItemAsync(clave, valor);
  } catch {
    /* sin almacenamiento: la sesión dura lo que dure la app abierta */
  }
}

export async function borrar(clave: string): Promise<void> {
  try {
    if (web) localStorage.removeItem(clave);
    else await SecureStore.deleteItemAsync(clave);
  } catch {
    /* nada que borrar */
  }
}
