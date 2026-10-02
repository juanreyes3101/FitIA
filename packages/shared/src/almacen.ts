// Dónde viven los tokens. Cada cliente trae su implementación:
// web = access en memoria + refresh en localStorage; móvil = expo-secure-store.

export interface AlmacenTokens {
  obtenerAccess(): string | null | Promise<string | null>;
  obtenerRefresh(): string | null | Promise<string | null>;
  guardar(access: string, refresh?: string): void | Promise<void>;
  limpiar(): void | Promise<void>;
}

/** Almacén solo en memoria (pruebas o clientes sin persistencia). */
export function almacenEnMemoria(): AlmacenTokens {
  let access: string | null = null;
  let refresh: string | null = null;
  return {
    obtenerAccess: () => access,
    obtenerRefresh: () => refresh,
    guardar(a, r) {
      access = a;
      if (r !== undefined) refresh = r;
    },
    limpiar() {
      access = null;
      refresh = null;
    },
  };
}
