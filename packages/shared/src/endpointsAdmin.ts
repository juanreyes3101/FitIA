// Endpoints de FitIA Control (escritorio): admin, entrenador, reportes y monitoreo (docs/02_arquitectura.md §4).
import type { ClienteApi } from './cliente';
import type { Ejercicio, Rol, Rutina, Usuario } from './tipos';
import type {
  AccionRemediacion, Anomalia, AnuncioAdmin, AnuncioAdminEntrada, BorradoAdmin, CondicionCatalogo, Contraindicacion,
  EjercicioAdmin, EjercicioAdminEntrada, EstadoAnomalia, EstadoMonitor, EstadoUsuario, Metrica, NombreReporte,
  PlanAdmin, PlanAdminEntrada, ReporteAdherencia, ReporteIngresos, ReporteUsoIa, RespuestaSimularPico,
  RevisionRutina, RutinaPendiente, SerieMetrica, ServicioSalud, UsuarioAdmin, UsuarioAdminCrear, UsuarioAdminEditar,
} from './tiposAdmin';

function crud<T, E>(api: ClienteApi, ruta: string) {
  return {
    listar: () => api<T[]>(ruta),
    crear: (datos: E) => api<T>(ruta, { metodo: 'POST', cuerpo: datos }),
    editar: (id: number, datos: E) => api<T>(`${ruta}/${id}`, { metodo: 'PUT', cuerpo: datos }),
    borrar: (id: number) => api<BorradoAdmin>(`${ruta}/${id}`, { metodo: 'DELETE' }),
  };
}

export type PasoMetrica = '10s' | '30s' | '1min';

export function crearEndpointsAdmin(api: ClienteApi) {
  return {
    monitoreo: {
      servicios: () => api<ServicioSalud[]>('/monitoreo/servicios'),
      metricas: (q: { servicio?: string; metrica?: Metrica; min?: number; paso?: PasoMetrica } = {}) =>
        api<SerieMetrica>('/monitoreo/metricas', { query: q }),
      anomalias: (q: { estado?: EstadoAnomalia; limite?: number } = {}) =>
        api<Anomalia[]>('/monitoreo/anomalias', { query: q }),
      acciones: (limite = 50) => api<AccionRemediacion[]>('/monitoreo/acciones', { query: { limite } }),
      estado: () => api<EstadoMonitor>('/monitoreo/estado'),
      simularPico: (datos: { servicio?: string; metrica?: Metrica; minutos?: number; factor?: number } = {}) =>
        api<RespuestaSimularPico>('/monitoreo/simular-pico', { metodo: 'POST', cuerpo: datos }),
    },
    usuarios: {
      listar: (q: { rol?: Rol; estado?: EstadoUsuario } = {}) => api<UsuarioAdmin[]>('/admin/usuarios', { query: q }),
      /** Crear y editar devuelven el usuario público (sin plan ni IMC). */
      crear: (datos: UsuarioAdminCrear) => api<Usuario>('/admin/usuarios', { metodo: 'POST', cuerpo: datos }),
      editar: (id: number, datos: UsuarioAdminEditar) =>
        api<Usuario>(`/admin/usuarios/${id}`, { metodo: 'PUT', cuerpo: datos }),
      desactivar: (id: number) => api<BorradoAdmin>(`/admin/usuarios/${id}`, { metodo: 'DELETE' }),
    },
    ejercicios: {
      ...crud<EjercicioAdmin, EjercicioAdminEntrada>(api, '/admin/ejercicios'),
      /** Catálogo con los nombres de grupo y equipo (GET /ejercicios). */
      catalogo: () => api<Ejercicio[]>('/ejercicios'),
    },
    condiciones: () => api<CondicionCatalogo[]>('/admin/condiciones'),
    contraindicaciones: {
      listar: () => api<Contraindicacion[]>('/admin/contraindicaciones'),
      crear: (datos: { ejercicio_id: number; condicion_id: number; motivo: string }) =>
        api<{ ejercicio_id: number; condicion_id: number; motivo: string }>('/admin/contraindicaciones', {
          metodo: 'POST',
          cuerpo: datos,
        }),
      borrar: (ejercicioId: number, condicionId: number) =>
        api<{ ok: true }>(`/admin/contraindicaciones/${ejercicioId}/${condicionId}`, { metodo: 'DELETE' }),
    },
    planes: crud<PlanAdmin, PlanAdminEntrada>(api, '/admin/planes'),
    anuncios: crud<AnuncioAdmin, AnuncioAdminEntrada>(api, '/admin/anuncios'),
    entrenador: {
      pendientes: () => api<RutinaPendiente[]>('/entrenador/rutinas-pendientes'),
      revisar: (id: number, datos: RevisionRutina) =>
        api<Rutina>(`/entrenador/rutinas/${id}`, { metodo: 'PATCH', cuerpo: datos }),
    },
    reportes: {
      ingresos: () => api<ReporteIngresos>('/reportes/ingresos'),
      usoIa: () => api<ReporteUsoIa>('/reportes/uso-ia'),
      adherencia: () => api<ReporteAdherencia>('/reportes/adherencia'),
      csv: (nombre: NombreReporte) =>
        api<string>(`/reportes/${nombre}`, { query: { formato: 'csv' }, respuesta: 'texto' }),
    },
  };
}

export type EndpointsAdmin = ReturnType<typeof crearEndpointsAdmin>;
