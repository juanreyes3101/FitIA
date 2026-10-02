import { useCallback, useEffect, useRef, useState } from 'react';

export interface Datos<T> {
  datos: T | undefined;
  /** Solo la primera carga (sin datos aún): pantalla de "Cargando…" */
  cargando: boolean;
  /** Recarga con datos ya visibles (deslizar hacia abajo o volver a la pestaña) */
  refrescando: boolean;
  error: unknown;
  recargar: () => void;
  setDatos: (d: T) => void;
}

/**
 * Carga datos de la API con estados de carga y error, y un recargar() para "Reintentar".
 * A diferencia de la web, al recargar se conservan los datos anteriores para que la pestaña no parpadee.
 */
export function useDatos<T>(cargar: () => Promise<T>, deps: unknown[] = []): Datos<T> {
  const [datos, setDatos] = useState<T>();
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [n, setN] = useState(0);
  const fn = useRef(cargar);
  fn.current = cargar;
  const hayDatos = useRef(false);

  useEffect(() => {
    let vivo = true;
    if (hayDatos.current) setRefrescando(true);
    else setCargando(true);
    setError(null);
    fn.current()
      .then((d) => {
        if (!vivo) return;
        hayDatos.current = true;
        setDatos(d);
      })
      .catch((e) => vivo && setError(e))
      .finally(() => {
        if (!vivo) return;
        setCargando(false);
        setRefrescando(false);
      });
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, ...deps]);

  const recargar = useCallback(() => setN((x) => x + 1), []);
  return { datos, cargando, refrescando, error, recargar, setDatos };
}
