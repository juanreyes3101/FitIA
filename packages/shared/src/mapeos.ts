// Traducción entre las opciones del diseño (lo que ve el usuario) y los enums de la API.
import type {
  ClasificacionImc, CodigoCondicion, Dificultad, NivelActividad, Objetivo, Sexo, TipoEjercicio,
} from './tipos';

type Opcion<T> = { valor: T; etiqueta: string; detalle?: string };

export const ACTIVIDADES: Opcion<NivelActividad>[] = [
  { valor: 'SEDENTARIO', etiqueta: 'Sedentaria', detalle: 'Casi no me muevo. Trabajo o estudio sentada.' },
  { valor: 'LIGERO', etiqueta: 'Algo activa', detalle: 'Camino o subo escaleras a diario.' },
  { valor: 'MODERADO', etiqueta: 'Activa', detalle: 'Hago ejercicio 1 o 2 veces por semana.' },
  { valor: 'ACTIVO', etiqueta: 'Muy activa', detalle: 'Entreno 3 o más veces por semana.' },
];

export const OBJETIVOS: Opcion<Objetivo>[] = [
  { valor: 'BAJAR_PESO', etiqueta: 'Bajar de peso', detalle: 'Cardio y fuerza para quemar grasa.' },
  { valor: 'GANAR_MASA', etiqueta: 'Ganar fuerza', detalle: 'Levantar más, con buena técnica.' },
  { valor: 'TONIFICAR', etiqueta: 'Tonificar', detalle: 'Más firmeza muscular.' },
  { valor: 'SALUD_GENERAL', etiqueta: 'Más energía', detalle: 'Sentirme mejor en el día.' },
  { valor: 'ALIVIAR_LUMBAR', etiqueta: 'Movilidad', detalle: 'Moverme sin rigidez ni dolor.' },
];

/** Molestias autorreportadas (las de IMC las asigna el trigger de mediciones). */
export const MOLESTIAS: Opcion<CodigoCondicion>[] = [
  { valor: 'DOLOR_LUMBAR', etiqueta: 'Lumbar', detalle: 'Espalda baja' },
  { valor: 'DOLOR_RODILLA', etiqueta: 'Rodilla', detalle: 'Una o ambas' },
  { valor: 'HIPERTENSION', etiqueta: 'Hipertensión', detalle: 'Presión alta' },
];

export const SEVERIDADES: Opcion<1 | 2 | 3>[] = [
  { valor: 1, etiqueta: 'Leve' },
  { valor: 2, etiqueta: 'Moderada' },
  { valor: 3, etiqueta: 'Alta' },
];

export const SEXOS: Opcion<Sexo>[] = [
  { valor: 'F', etiqueta: 'Mujer' },
  { valor: 'M', etiqueta: 'Hombre' },
  { valor: 'O', etiqueta: 'Otro' },
  { valor: 'N', etiqueta: 'Prefiero no decir' },
];

export const TIPOS_EJERCICIO: Record<TipoEjercicio, string> = {
  FUERZA: 'Fuerza',
  CARDIO: 'Cardio',
  ESTIRAMIENTO: 'Estiramiento',
  MOVILIDAD: 'Movilidad',
  CORE: 'Core',
};

export const DIFICULTADES: Record<Dificultad, string> = {
  PRINCIPIANTE: 'Principiante',
  INTERMEDIO: 'Intermedio',
  AVANZADO: 'Avanzado',
};

export const CLASIFICACIONES_IMC: Record<ClasificacionImc, string> = {
  BAJO_PESO: 'Bajo peso',
  NORMAL: 'Normal',
  SOBREPESO: 'Sobrepeso',
  OBESIDAD: 'Obesidad',
};

export function etiqueta<T>(opciones: Opcion<T>[], valor: T | null | undefined): string {
  return opciones.find((o) => o.valor === valor)?.etiqueta ?? '';
}

/** Misma regla OMS que fn_clasificar_imc y services/perfil.clasificar_imc. */
export function clasificarImc(imc: number): ClasificacionImc {
  if (imc < 18.5) return 'BAJO_PESO';
  if (imc < 25) return 'NORMAL';
  if (imc < 30) return 'SOBREPESO';
  return 'OBESIDAD';
}

export function calcularImc(pesoKg: number, estaturaCm: number): number {
  const m = estaturaCm / 100;
  return Math.round((pesoKg / (m * m)) * 100) / 100;
}

/** Formatos colombianos */
export const formatoCop = (valor: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(valor);

export const formatoNumero = (valor: number, decimales = 1) =>
  new Intl.NumberFormat('es-CO', { minimumFractionDigits: decimales, maximumFractionDigits: decimales }).format(valor);

/** Algoritmo de Luhn (el backend vuelve a validarlo). */
export function luhnValido(numero: string): boolean {
  const d = numero.replace(/\D/g, '');
  if (d.length < 12 || d.length > 19) return false;
  let total = 0;
  for (let i = 0; i < d.length; i++) {
    let n = Number(d[d.length - 1 - i]);
    if (i % 2 === 1) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    total += n;
  }
  return total % 10 === 0;
}

export const esVerdadero = (v: boolean | 0 | 1 | null | undefined) => v === true || v === 1;
