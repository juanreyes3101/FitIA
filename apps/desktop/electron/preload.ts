// Puente mínimo entre el renderer (sandbox) y el proceso principal. Nada de Node en el renderer.
import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';

contextBridge.exposeInMainWorld('fitia', {
  config: {
    obtener: () => ipcRenderer.invoke('config:obtener'),
    guardar: (apiUrl: string) => ipcRenderer.invoke('config:guardar', apiUrl),
  },
  sesion: {
    obtener: () => ipcRenderer.invoke('sesion:obtener'),
    guardar: (texto: string | null) => ipcRenderer.invoke('sesion:guardar', texto),
  },
  ventana: {
    minimizar: () => ipcRenderer.invoke('ventana:minimizar'),
    maximizar: () => ipcRenderer.invoke('ventana:maximizar'),
    cerrar: () => ipcRenderer.invoke('ventana:cerrar'),
    alMaximizar: (fn: (maximizada: boolean) => void) => {
      const oyente = (_e: IpcRendererEvent, v: boolean) => fn(v);
      ipcRenderer.on('ventana:maximizada', oyente);
      return () => ipcRenderer.removeListener('ventana:maximizada', oyente);
    },
  },
  archivos: {
    guardar: (nombre: string, contenido: string) => ipcRenderer.invoke('archivo:guardar', nombre, contenido),
  },
});
