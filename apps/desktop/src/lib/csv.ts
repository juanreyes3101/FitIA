/** Arma un CSV (separador coma, comillas dobles) y lo guarda con el diálogo nativo, o lo descarga en un navegador. */
export function aCsv(filas: Record<string, unknown>[], columnas: [clave: string, titulo: string][]): string {
  const celda = (v: unknown) => {
    const s = v == null ? '' : String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [columnas.map(([, t]) => celda(t)).join(','), ...filas.map((f) => columnas.map(([k]) => celda(f[k])).join(','))].join('\n');
}

export async function guardarCsv(nombre: string, contenido: string): Promise<string | null> {
  if (window.fitia) return window.fitia.archivos.guardar(nombre, contenido);
  const url = URL.createObjectURL(new Blob(['﻿', contenido], { type: 'text/csv;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: nombre });
  a.click();
  URL.revokeObjectURL(url);
  return nombre;
}
