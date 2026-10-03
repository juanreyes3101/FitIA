// Tipos de los endpoints de administración, reportes, entrenador y monitoreo (FitIA Control).
import type { Booleano, ClasificacionImc, CodigoCondicion, Dificultad, Impacto, Objetivo, Rol, TipoEjercicio,
  UbicacionAnuncio } from './tipos';

// ---------- monitoreo (MAPE-K) ----------
export type CodigoServicio = 'api' | 'ia' | 'db' | 'web' | string;
export type Metrica = 'LATENCIA_MS' | 'TASA_ERROR' | 'RPS' | 'CPU_PCT' | 'MEM_PCT';
export type Severidad = 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';
export type EstadoAnomalia = 'ABIERTA' | 'MITIGADA' | 'DESCARTADA';
export type TipoAccion =
  | 'ESCALAR_ARRIBA' | 'ESCALAR_ABAJO' | 'REINICIAR_WORKER' | 'LIMPIAR_CACHE'
  | 'CIRCUIT_BREAKER' | 'CAMBIAR_PROVEEDOR_IA' | 'NOTIFICAR_ADMIN';

export interface ServicioSalud {
  codigo: CodigoServicio;
  nombre: string;
  estado: 'SALUDABLE' | 'DEGRADADO' | 'CAIDO';
  replicas_actuales: number;
  replicas_min: number;
  replicas_max: number;
  anomalias_abiertas: number;
  ultima_anomalia: string | null;
}

export interface PuntoMetrica {
  t: string;
  valor: number;
  media: number;
  banda_inf: number;
  banda_sup: number;
}

export interface SerieMetrica {
  servicio: CodigoServicio;
  metrica: Metrica;
  ventana_min: number;
  paso: '10s' | '30s' | '1min';
  puntos: PuntoMetrica[];
  resumen: { muestras: number; media: number; desviacion: number; p95: number } | null;
}

export interface Anomalia {
  id: number;
  servicio_id: number;
  servicio: CodigoServicio;
  linea_base_id: number | null;
  metrica: Metrica;
  valor_observado: number;
  valor_esperado: number;
  zscore: number;
  severidad: Severidad;
  estado: EstadoAnomalia;
  detectada_en: string;
  resuelta_en: string | null;
}

export interface AccionRemediacion {
  id: number;
  anomalia_id: number;
  servicio: CodigoServicio;
  metrica: Metrica;
  severidad: Severidad;
  zscore: number;
  estado_anomalia: EstadoAnomalia;
  tipo: TipoAccion;
  detalle: string | null;
  replicas_antes: number | null;
  replicas_despues: number | null;
  resultado: 'EXITOSA' | 'FALLIDA' | 'PENDIENTE';
  ejecutada_en: string;
}

export interface LineaBaseActual {
  servicio: CodigoServicio;
  metrica: Metrica;
  media: number;
  desviacion: number;
  p95: number | null;
  ventana_min: number;
  muestras: number;
  calculada_en: string;
}

export interface EstadoMonitor {
  intervalo_seg: number;
  ventana_min: number;
  umbral_z: number;
  umbral_error: number;
  enfriamiento_seg: number;
  worker: { ultimo_ciclo: string | null; activo: boolean };
  ia: {
    configurado: 'gemini' | 'mock';
    efectivo: 'gemini' | 'mock';
    forzada_por_monitor: boolean;
    circuit_breaker: string;
  };
  lineas_base: LineaBaseActual[];
}

export interface CicloMapeK {
  ahora: string;
  anomalias: {
    id: number; servicio: string; metrica: Metrica; valor_observado: number; valor_esperado: number;
    desviacion: number; zscore: number; severidad: Severidad;
  }[];
  acciones: {
    id: number; anomalia_id: number; servicio: string; tipo: TipoAccion; detalle: string;
    replicas_antes: number | null; replicas_despues: number | null;
  }[];
  mitigadas: { id: number; servicio: string; metrica: Metrica; valor: number }[];
  omitido?: boolean;
}

export interface RespuestaSimularPico {
  servicio: string;
  metrica: Metrica;
  muestras_insertadas: number;
  sobre_base_real: boolean;
  ciclo: CicloMapeK;
  mensaje: string;
}

// ---------- admin ----------
export type EstadoUsuario = 'ACTIVO' | 'INACTIVO' | 'BLOQUEADO';

export interface UsuarioAdmin {
  id: number;
  nombres: string;
  apellidos: string;
  email: string;
  telefono: string | null;
  estado: EstadoUsuario;
  rol: Rol;
  creado_en: string;
  ultimo_acceso: string | null;
  peso_kg: number | null;
  imc: number | null;
  clasificacion_imc: ClasificacionImc | null;
  plan: string | null;
}

export interface UsuarioAdminCrear {
  nombres: string;
  apellidos: string;
  email: string;
  password: string;
  rol: Rol;
  telefono?: string | null;
}

export interface UsuarioAdminEditar {
  nombres?: string;
  apellidos?: string;
  telefono?: string | null;
  rol?: Rol;
  estado?: EstadoUsuario;
}

export interface CondicionCatalogo {
  id: number;
  codigo: CodigoCondicion;
  nombre: string;
  descripcion: string | null;
  origen: 'IMC' | 'AUTORREPORTE';
}

export interface Contraindicacion {
  ejercicio_id: number;
  condicion_id: number;
  motivo: string;
  ejercicio: string;
  condicion: CodigoCondicion;
}

export interface EjercicioAdmin {
  id: number;
  nombre: string;
  tipo: TipoEjercicio;
  grupo_muscular_id: number;
  equipamiento_id: number;
  dificultad: Dificultad;
  impacto: Impacto;
  apto_lumbar: Booleano;
  instrucciones: string | null;
  imagen_url: string | null;
  video_url: string | null;
}

export type EjercicioAdminEntrada = Omit<EjercicioAdmin, 'id' | 'apto_lumbar'> & { apto_lumbar: boolean };

export interface PlanAdmin {
  id: number;
  codigo: string;
  nombre: string;
  precio_cop: number;
  duracion_dias: number | null;
  con_publicidad: Booleano;
  rutinas_ia_mes: number;
  activo: Booleano;
}

export type PlanAdminEntrada = Omit<PlanAdmin, 'id' | 'con_publicidad' | 'activo'> & {
  con_publicidad: boolean;
  activo: boolean;
};

export interface AnuncioAdmin {
  id: number;
  anunciante: string;
  titulo: string;
  imagen_url: string | null;
  destino_url: string | null;
  ubicacion: UbicacionAnuncio;
  impresiones: number;
  clics: number;
  activo: Booleano;
}

export type AnuncioAdminEntrada = Omit<AnuncioAdmin, 'id' | 'impresiones' | 'clics' | 'activo'> & {
  activo: boolean;
};

export interface BorradoAdmin {
  ok: true;
  id: number;
  borrado_logico?: boolean;
  estado?: string;
}

// ---------- entrenador ----------
export interface RutinaPendiente {
  id: number;
  nombre: string;
  objetivo: Objetivo;
  origen: 'IA' | 'ENTRENADOR' | 'PLANTILLA';
  estado: string;
  semanas: number;
  creada_en: string;
  usuario_id: number;
  usuario: string;
}

export interface AjusteEjercicio {
  rutina_ejercicio_id: number;
  series?: number;
  repeticiones?: number;
  duracion_seg?: number;
  descanso_seg?: number;
  notas?: string;
}

export interface RevisionRutina {
  accion: 'APROBAR' | 'RECHAZAR' | 'AJUSTAR';
  observaciones?: string;
  ajustes?: AjusteEjercicio[];
}

// ---------- reportes ----------
export type NombreReporte = 'ingresos' | 'uso-ia' | 'adherencia';

export interface FilaIngresos {
  mes: string;
  plan: string;
  pagos_aprobados: number;
  total_cop: number;
}

export interface FilaUsoIa {
  dia: string;
  proveedor: string;
  modelo: string;
  solicitudes: number;
  exitosas: number;
  rechazadas_por_seguridad: number;
  latencia_promedio_ms: number | null;
  tokens_entrada: number | null;
  tokens_salida: number | null;
}

export interface FilaAdherencia {
  usuario_id: number;
  semana_iso: number;
  sesiones: number;
  completadas: number;
  rpe_promedio: number | null;
  dolor_promedio: number | null;
}

export interface Reporte<F, R = Record<string, unknown>> {
  reporte: NombreReporte;
  resumen: R;
  filas: F[];
}

export type ReporteIngresos = Reporte<FilaIngresos, { total_cop: number; pagos_aprobados: number }>;
export type ReporteUsoIa = Reporte<FilaUsoIa, {
  solicitudes: number; exitosas?: number; rechazadas_por_seguridad?: number; por_proveedor?: Record<string, number>;
}>;
export type ReporteAdherencia = Reporte<FilaAdherencia, {
  sesiones: number; tasa_completadas?: number; dolor_promedio?: number;
}>;
