// Tipos de la API FitIA (/api/v1). Reflejan lo que devuelve el backend en backend/app/api y services.
// MySQL devuelve los BOOLEAN como 0/1, por eso varios campos son `Booleano`.

export type Booleano = boolean | 0 | 1;
export type Rol = 'USUARIO' | 'ENTRENADOR' | 'ADMIN';
export type Sexo = 'F' | 'M' | 'O' | 'N';
export type NivelActividad = 'SEDENTARIO' | 'LIGERO' | 'MODERADO' | 'ACTIVO' | 'MUY_ACTIVO';
export type Objetivo = 'BAJAR_PESO' | 'GANAR_MASA' | 'TONIFICAR' | 'SALUD_GENERAL' | 'ALIVIAR_LUMBAR';
export type LugarEntreno = 'GIMNASIO' | 'CASA' | 'PARQUE';
export type ClasificacionImc = 'BAJO_PESO' | 'NORMAL' | 'SOBREPESO' | 'OBESIDAD';
export type CodigoCondicion =
  | 'BAJO_PESO' | 'SOBREPESO' | 'OBESIDAD' | 'DOLOR_LUMBAR' | 'DOLOR_RODILLA' | 'HIPERTENSION';
export type TipoEjercicio = 'FUERZA' | 'CARDIO' | 'ESTIRAMIENTO' | 'MOVILIDAD' | 'CORE';
export type Dificultad = 'PRINCIPIANTE' | 'INTERMEDIO' | 'AVANZADO';
export type Impacto = 'BAJO' | 'MEDIO' | 'ALTO';
export type MetodoPago = 'TARJETA' | 'PSE' | 'NEQUI';
export type UbicacionAnuncio = 'BANNER_HOME' | 'ENTRE_EJERCICIOS' | 'FIN_SESION';

// ---------- auth ----------
export interface Usuario {
  id: number;
  nombres: string;
  apellidos: string;
  email: string;
  rol: Rol;
  estado: 'ACTIVO' | 'INACTIVO' | 'BLOQUEADO';
}

export interface RespuestaAuth {
  usuario: Usuario;
  access_token: string;
  refresh_token: string;
  token_type: 'Bearer';
  expira_en_seg: number;
}

export interface RegistroEntrada {
  nombres: string;
  apellidos: string;
  email: string;
  password: string;
  telefono?: string | null;
  fecha_nacimiento?: string | null;
  sexo?: Sexo;
  acepta_terminos: boolean;
}

// ---------- IMC ----------
export interface ImcResultado {
  peso_kg: number;
  estatura_cm: number;
  imc: number;
  clasificacion: ClasificacionImc;
  mensaje: string;
  aviso: string;
}

// ---------- perfil ----------
export interface Condicion {
  id: number;
  codigo: CodigoCondicion;
  nombre: string;
  origen: 'IMC' | 'AUTORREPORTE';
  severidad: 1 | 2 | 3;
  desde: string;
}

export interface PerfilSalud {
  nivel_actividad: NivelActividad;
  objetivo: Objetivo;
  dias_disponibles: number;
  minutos_por_sesion: number;
  lugar_entreno: LugarEntreno;
  observaciones: string | null;
  actualizado_en: string;
}

export interface Suscripcion {
  id: number;
  fecha_inicio: string;
  fecha_fin: string | null;
  estado: 'ACTIVA' | 'VENCIDA' | 'CANCELADA';
  codigo: string;
  nombre: string;
  con_publicidad: Booleano;
  rutinas_ia_mes: number;
}

export interface Perfil {
  usuario_id: number;
  nombre: string | null;
  email: string | null;
  edad: number | null;
  fecha_nacimiento: string | null;
  sexo: Sexo | null;
  medicion_actual: {
    peso_kg: number | null;
    estatura_cm: number | null;
    imc: number | null;
    clasificacion_imc: ClasificacionImc | null;
  };
  perfil: PerfilSalud | null;
  condiciones: Condicion[];
  plan: Suscripcion | null;
  cupo_ia_restante: number;
}

export interface PerfilEntrada {
  nivel_actividad: NivelActividad;
  objetivo: Objetivo;
  dias_disponibles: number;
  minutos_por_sesion: number;
  lugar_entreno?: LugarEntreno;
  observaciones?: string | null;
  /** Solo condiciones AUTORREPORTE. Las de IMC las asigna el trigger de mediciones. */
  condiciones?: { codigo: CodigoCondicion; severidad: 1 | 2 | 3 }[];
  fecha_nacimiento?: string;
  sexo?: Sexo;
}

export interface Medicion {
  id: number;
  usuario_id: number;
  peso_kg: number;
  estatura_cm: number;
  imc: number;
  cintura_cm: number | null;
  registrado_en: string;
  clasificacion: ClasificacionImc;
}

// ---------- ejercicios ----------
export interface Ejercicio {
  id: number;
  nombre: string;
  tipo: TipoEjercicio;
  grupo: string;
  equipo: string;
  dificultad: Dificultad;
  impacto: Impacto;
  apto_lumbar: Booleano;
  instrucciones?: string | null;
  imagen_url?: string | null;
  video_url?: string | null;
}

// ---------- rutinas ----------
export interface RutinaEjercicio {
  rutina_ejercicio_id: number;
  ejercicio_id: number;
  nombre: string;
  tipo: TipoEjercicio;
  dificultad: Dificultad;
  impacto: Impacto;
  apto_lumbar: boolean;
  orden: number;
  series: number;
  repeticiones: number | null;
  duracion_seg: number | null;
  descanso_seg: number;
  notas: string | null;
  instrucciones: string | null;
}

export interface RutinaDia {
  rutina_dia_id: number;
  dia_numero: number;
  enfoque: string;
  ejercicios: RutinaEjercicio[];
}

export interface Rutina {
  id: number;
  usuario_id: number;
  nombre: string;
  objetivo: Objetivo;
  origen: 'IA' | 'ENTRENADOR' | 'PLANTILLA';
  estado: 'BORRADOR' | 'VALIDADA' | 'RECHAZADA' | 'ACTIVA' | 'ARCHIVADA';
  semanas: number;
  observaciones_validacion: string | null;
  entrenador_revisor_id: number | null;
  creada_en: string;
  dias: RutinaDia[];
}

export interface RutinaGenerada extends Rutina {
  explicacion: string;
  proveedor: string;
  desde_cache: boolean;
}

// ---------- sesiones y progreso ----------
export interface SesionEntrada {
  rutina_dia_id?: number | null;
  duracion_min?: number | null;
  esfuerzo_percibido: number;
  dolor_reportado: number;
  completada?: boolean;
  notas?: string | null;
  ejercicios?: { ejercicio_id: number; series_hechas: number; reps_hechas?: number | null; peso_kg?: number | null }[];
}

export interface SesionRegistrada {
  sesion: {
    id: number;
    fecha: string;
    duracion_min: number | null;
    esfuerzo_percibido: number;
    dolor_reportado: number;
    completada: Booleano;
  };
  alerta_dolor: boolean;
  mensaje: string;
}

export interface PuntoCorporal {
  fecha: string;
  peso_kg: number;
  imc: number;
  clasificacion: ClasificacionImc;
}

export interface SemanaAdherencia {
  /** YEARWEEK ISO, p. ej. 202639 */
  semana_iso: number;
  sesiones: number;
  completadas: number;
  rpe_promedio: number | null;
  dolor_promedio: number | null;
}

export interface Progreso {
  dias: number;
  corporal: PuntoCorporal[];
  adherencia_semanal: SemanaAdherencia[];
}

// ---------- planes, pagos y anuncios ----------
export interface Plan {
  id: number;
  codigo: 'GRATIS' | 'PREMIUM_MES' | 'PREMIUM_ANUAL' | string;
  nombre: string;
  precio_cop: number;
  duracion_dias: number | null;
  con_publicidad: Booleano;
  rutinas_ia_mes: number;
  activo: Booleano;
}

export interface PagoEntrada {
  plan_codigo: string;
  metodo: MetodoPago;
  /** Solo para TARJETA. El backend valida Luhn y guarda solo los últimos 4. */
  numero_tarjeta?: string;
}

export interface Pago {
  pago_id: number;
  estado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
  motivo_rechazo: string | null;
  referencia: string;
  monto_cop: number;
  metodo: MetodoPago;
  ultimos4: string | null;
  simulado: true;
  suscripcion: Suscripcion | null;
  aviso: string;
}

export interface Anuncio {
  id: number;
  anunciante: string;
  titulo: string;
  imagen_url: string | null;
  destino_url: string | null;
  ubicacion: UbicacionAnuncio;
}

export interface RespuestaAnuncio {
  anuncio: Anuncio | null;
  motivo?: string;
}

// ---------- errores ----------
export interface CuerpoError {
  error: { codigo: string; mensaje: string };
}
