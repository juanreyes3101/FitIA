/// <reference types="vite/client" />

/** Puente expuesto por electron/preload.ts. No existe si el renderer se abre en un navegador. */
interface PuenteFitia {
  config: {
    obtener(): Promise<{ apiUrl: string; version: string }>;
    guardar(apiUrl: string): Promise<{ apiUrl: string }>;
  };
  sesion: {
    obtener(): Promise<string | null>;
    guardar(texto: string | null): Promise<void>;
  };
  ventana: {
    minimizar(): Promise<void>;
    maximizar(): Promise<boolean>;
    cerrar(): Promise<void>;
    alMaximizar(fn: (maximizada: boolean) => void): () => void;
  };
  archivos: {
    guardar(nombre: string, contenido: string): Promise<string | null>;
  };
}

interface Window {
  fitia?: PuenteFitia;
}
