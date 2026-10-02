import { useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';

/**
 * Las pestañas no se desmontan: al volver a una (después de entrenar, pagar o medir) se recargan
 * sus datos. La primera vez no, porque useDatos ya cargó al montar.
 */
export function useRecargarAlVolver(recargar: () => void) {
  const primera = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (primera.current) {
        primera.current = false;
        return;
      }
      recargar();
    }, [recargar]),
  );
}
