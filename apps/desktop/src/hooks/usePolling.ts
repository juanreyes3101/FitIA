import { useCallback, useEffect, useRef, useState } from 'react';

export interface Sondeo<T> {
  datos: T | undefined;
  error: unknown;
  /** true solo en la primera carga (los refrescos no parpadean). */
  cargando: boolean;
  actualizado: Date | null;
  refrescar: () => Promise<void>;
}

/**
 * Pide los datos cada `ms` (5 s en Monitoreo). Se pausa si la ventana está oculta o minimizada,
 * nunca encadena dos peticiones a la vez y conserva los últimos datos buenos si una falla.
 */
export function usePolling<T>(cargar: () => Promise<T>, ms = 5000): Sondeo<T> {
  const [datos, setDatos] = useState<T>();
  const [error, setError] = useState<unknown>(null);
  const [actualizado, setActualizado] = useState<Date | null>(null);
  const fn = useRef(cargar);
  fn.current = cargar;
  const enCurso = useRef(false);
  const vivo = useRef(true);

  const refrescar = useCallback(async () => {
    if (enCurso.current) return;
    enCurso.current = true;
    try {
      const d = await fn.current();
      if (!vivo.current) return;
      setDatos(d);
      setError(null);
      setActualizado(new Date());
    } catch (e) {
      if (vivo.current) setError(e);
    } finally {
      enCurso.current = false;
    }
  }, []);

  useEffect(() => {
    vivo.current = true;
    void refrescar();
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refrescar();
    }, ms);
    const alVolver = () => document.visibilityState === 'visible' && void refrescar();
    document.addEventListener('visibilitychange', alVolver);
    return () => {
      vivo.current = false;
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', alVolver);
    };
  }, [ms, refrescar]);

  return { datos, error, cargando: datos === undefined && !error, actualizado, refrescar };
}
