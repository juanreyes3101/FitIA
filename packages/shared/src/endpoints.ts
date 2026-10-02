// Funciones tipadas, una por endpoint del contrato (docs/02_arquitectura.md, sección 4).
import type { ClienteApi } from './cliente';
import type {
  Ejercicio, ImcResultado, Medicion, Pago, PagoEntrada, Perfil, PerfilEntrada, Plan, Progreso,
  RegistroEntrada, RespuestaAnuncio, RespuestaAuth, Rutina, RutinaGenerada, SesionEntrada,
  SesionRegistrada, TipoEjercicio, UbicacionAnuncio, Condicion,
} from './tipos';

export function crearEndpoints(api: ClienteApi) {
  return {
    auth: {
      login: (email: string, password: string) =>
        api<RespuestaAuth>('/auth/login', { metodo: 'POST', cuerpo: { email, password }, auth: false }),
      registro: (datos: RegistroEntrada) =>
        api<RespuestaAuth>('/auth/registro', { metodo: 'POST', cuerpo: datos, auth: false }),
      refresh: (refreshToken: string) =>
        api<{ access_token: string; expira_en_seg: number }>('/auth/refresh', { metodo: 'POST', token: refreshToken }),
    },
    imc: (peso: number, estatura: number, signal?: AbortSignal) =>
      api<ImcResultado>('/imc', { query: { peso, estatura }, auth: false, signal }),
    perfil: {
      obtener: () => api<Perfil>('/perfil'),
      actualizar: (datos: PerfilEntrada) => api<Perfil>('/perfil', { metodo: 'PUT', cuerpo: datos }),
      medicion: (datos: { peso_kg: number; estatura_cm: number; cintura_cm?: number }) =>
        api<{ medicion: Medicion; condiciones: Condicion[] }>('/perfil/mediciones', {
          metodo: 'POST',
          cuerpo: datos,
        }),
    },
    ejercicios: {
      listar: (filtro: { tipo?: TipoEjercicio; lumbar?: boolean } = {}) =>
        api<Ejercicio[]>('/ejercicios', { query: filtro }),
      seguros: () => api<Ejercicio[]>('/ejercicios/seguros'),
    },
    rutinas: {
      generar: () => api<RutinaGenerada>('/rutinas/generar', { metodo: 'POST' }),
      activa: () => api<Rutina>('/rutinas/activa'),
    },
    sesiones: {
      registrar: (datos: SesionEntrada) =>
        api<SesionRegistrada>('/sesiones', { metodo: 'POST', cuerpo: datos }),
    },
    progreso: (dias = 90) => api<Progreso>('/progreso', { query: { dias } }),
    planes: () => api<Plan[]>('/planes', { auth: false }),
    pagos: {
      simular: (datos: PagoEntrada) => api<Pago>('/pagos/simular', { metodo: 'POST', cuerpo: datos }),
    },
    anuncios: (ubicacion: UbicacionAnuncio = 'BANNER_HOME') =>
      api<RespuestaAnuncio>('/anuncios', { query: { ubicacion } }),
  };
}

export type EndpointsFitia = ReturnType<typeof crearEndpoints>;
