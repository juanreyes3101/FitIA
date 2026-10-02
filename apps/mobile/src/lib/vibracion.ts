// Vibración del diseño: toques cortos con expo-haptics y patrones con Vibration (Android respeta
// los tiempos; iOS vibra una vez). Respeta el interruptor "Vibración" de Perfil, que se guarda.
import { Platform, Vibration } from 'react-native';
import * as Haptics from 'expo-haptics';
import { guardar, leer } from './almacen';

const CLAVE = 'fitia.vibrar';
let activa = true;
leer(CLAVE).then((v) => {
  if (v === '0') activa = false;
});

export const vibracionActiva = () => activa;

export async function setVibracion(valor: boolean) {
  activa = valor;
  await guardar(CLAVE, valor ? '1' : '0');
}

const nativo = Platform.OS !== 'web';

/** Toque al elegir una opción o deslizar la gráfica. */
export function toque() {
  if (activa && nativo) Haptics.selectionAsync().catch(() => {});
}

/** Golpe al marcar "Serie lista" o cambiar de paso. */
export function golpe() {
  if (activa && nativo) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

/** Últimos segundos del descanso. */
export function aviso() {
  if (activa && nativo) Vibration.vibrate(40);
}

/** Fin del descanso: patrón largo del diseño [220, 90, 220]. */
export function finDescanso() {
  if (!activa || !nativo) return;
  Vibration.vibrate([0, 220, 90, 220]);
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

/** Error de validación (formulario incompleto). */
export function error() {
  if (!activa || !nativo) return;
  Vibration.vibrate([0, 60, 40, 60]);
}
