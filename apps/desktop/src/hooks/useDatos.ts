import { useCallback, useEffect, useRef, useState } from 'react';

export interface Datos<T> {
  datos: T | undefined;
  cargando: boolean;
  error: unknown;
  recargar: () => void;
  setDatos: (d: T) => void;
}

/** Carga datos de la API con estados de carga y error, y un recargar() para el botón "Reintentar". */
export function useDatos<T>(cargar: () => Promise<T>, deps: unknown[] = []): Datos<T> {
  const [datos, setDatos] = useState<T>();
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [n, setN] = useState(0);
  const fn = useRef(cargar);
  fn.current = cargar;

  useEffect(() => {
    let vivo = true;
    setCargando(true);
    setError(null);
    fn.current()
      .then((d) => vivo && setDatos(d))
      .catch((e) => vivo && setError(e))
      .finally(() => vivo && setCargando(false));
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, ...deps]);

  const recargar = useCallback(() => setN((x) => x + 1), []);
  return { datos, cargando, error, recargar, setDatos };
}
