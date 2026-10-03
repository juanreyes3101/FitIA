import { useState, type FormEvent } from 'react';
import { esVerdadero, type AnuncioAdmin, type AnuncioAdminEntrada, type PlanAdmin, type PlanAdminEntrada,
  type UbicacionAnuncio } from '@fitia/shared';
import { admin } from '../api';
import { useDatos } from '../hooks/useDatos';
import { decimal, entero } from '../lib/formato';
import { Boton } from '../ui/Boton';
import { Cargando, ErrorEstado, mensajeError } from '../ui/Estados';
import { Interruptor } from '../ui/Interruptor';
import { useToast } from '../ui/Toasts';

const UBICACIONES: Record<UbicacionAnuncio, string> = {
  BANNER_HOME: 'Inicio', ENTRE_EJERCICIOS: 'Entre ejercicios', FIN_SESION: 'Fin de sesión',
};

async function cargar() {
  const [planes, anuncios, usuarios] = await Promise.all([admin.planes.listar(), admin.anuncios.listar(), admin.usuarios.listar()]);
  const suscriptores = new Map<string, number>();
  usuarios.forEach((u) => u.plan && suscriptores.set(u.plan, (suscriptores.get(u.plan) ?? 0) + 1));
  return { planes, anuncios, suscriptores };
}

const entradaPlan = (p: PlanAdmin): PlanAdminEntrada => ({
  codigo: p.codigo, nombre: p.nombre, precio_cop: Number(p.precio_cop), duracion_dias: p.duracion_dias,
  con_publicidad: esVerdadero(p.con_publicidad), rutinas_ia_mes: p.rutinas_ia_mes, activo: esVerdadero(p.activo),
});
const entradaAnuncio = (a: AnuncioAdmin): AnuncioAdminEntrada => ({
  anunciante: a.anunciante, titulo: a.titulo, imagen_url: a.imagen_url, destino_url: a.destino_url, ubicacion: a.ubicacion,
  activo: esVerdadero(a.activo),
});

export default function Planes() {
  const avisar = useToast();
  const { datos, cargando, error, recargar, setDatos } = useDatos(cargar, []);
  const [precios, setPrecios] = useState<Record<number, string>>({});
  const [creando, setCreando] = useState(false);

  async function guardarPlan(p: PlanAdmin, cambios: Partial<PlanAdminEntrada>, texto: string) {
    try {
      const nuevo = await admin.planes.editar(p.id, { ...entradaPlan(p), ...cambios });
      setDatos({ ...datos!, planes: datos!.planes.map((x) => (x.id === p.id ? nuevo : x)) });
      avisar('ok', texto, nuevo.nombre);
    } catch (e) {
      avisar('err', 'No se pudo guardar el plan', mensajeError(e));
    }
  }

  async function guardarAnuncio(a: AnuncioAdmin, activo: boolean) {
    try {
      const nuevo = await admin.anuncios.editar(a.id, { ...entradaAnuncio(a), activo });
      setDatos({ ...datos!, anuncios: datos!.anuncios.map((x) => (x.id === a.id ? nuevo : x)) });
      avisar(activo ? 'ok' : 'warn', activo ? 'Anuncio activado' : 'Anuncio pausado', a.anunciante);
    } catch (e) {
      avisar('err', 'No se pudo cambiar el anuncio', mensajeError(e));
    }
  }

  const totImp = datos?.anuncios.reduce((s, a) => s + a.impresiones, 0) ?? 0;
  const totClk = datos?.anuncios.reduce((s, a) => s + a.clics, 0) ?? 0;
  return (
    <div className="flex animate-entrada flex-col gap-[14px]">
      <header>
        <div className="kicker">PRECIOS EN COP · COBROS SIMULADOS</div>
        <h1 className="titulo-pagina">Planes y anuncios</h1>
      </header>

      {cargando && !datos ? <Cargando /> : error || !datos ? <ErrorEstado error={error} reintentar={recargar} /> : (
        <>
          <div className="grid grid-cols-3 gap-[10px]">
            {datos.planes.map((p) => {
              const activo = esVerdadero(p.activo);
              const texto = precios[p.id] ?? String(Math.round(Number(p.precio_cop)));
              const cambiado = Number(texto) !== Math.round(Number(p.precio_cop));
              return (
                <div key={p.id} className={`panel flex flex-col gap-3 p-[14px] ${activo ? '' : 'opacity-60'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-titulo text-[22px] uppercase leading-none">{p.nombre}</span>
                    <Interruptor activo={activo} etiqueta={`Plan ${p.nombre}`} alCambiar={(v) => void guardarPlan(p, { activo: v }, v ? 'Plan activado' : 'Plan pausado')} />
                  </div>
                  <label className="flex items-center gap-2">
                    <span className="font-metrica text-[22px] text-niebla">$</span>
                    <input value={texto} inputMode="numeric" aria-label={`Precio ${p.nombre}`}
                      onChange={(e) => setPrecios({ ...precios, [p.id]: e.target.value.replace(/\D/g, '') })}
                      className="min-h-[44px] w-full min-w-0 rounded border border-grafito bg-asfalto px-3 font-metrica text-[24px] font-bold text-hueso outline-none focus:border-voltaje" />
                    <span className="whitespace-nowrap text-[12px] text-niebla">{p.duracion_dias ? `/ ${p.duracion_dias} días` : 'siempre'}</span>
                  </label>
                  {cambiado && (
                    <div className="flex justify-end gap-2">
                      <Boton chico variante="fantasma" onClick={() => setPrecios({ ...precios, [p.id]: String(Math.round(Number(p.precio_cop))) })}>Deshacer</Boton>
                      <Boton chico variante="primario" onClick={() => void guardarPlan(p, { precio_cop: Number(texto) || 0 }, 'Precio actualizado')}>Guardar precio</Boton>
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-px border border-grafito bg-grafito">
                    <div className="bg-concreto p-2"><div className="font-metrica text-[18px] font-bold">{entero(datos.suscriptores.get(p.nombre) ?? 0)}</div><span className="text-[10px] font-bold text-niebla">SUSCRIPTORES</span></div>
                    <div className="bg-concreto p-2"><div className="font-metrica text-[18px] font-bold">{p.rutinas_ia_mes}</div><span className="text-[10px] font-bold text-niebla">RUTINAS IA/MES</span></div>
                    <div className="bg-concreto p-2"><div className="font-metrica text-[18px] font-bold">{esVerdadero(p.con_publicidad) ? 'SÍ' : 'NO'}</div><span className="text-[10px] font-bold text-niebla">ANUNCIOS</span></div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="panel flex flex-col gap-3 p-[14px]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="titulo-panel">ANUNCIOS · SOLO PLAN FREE</span>
              <div className="flex gap-4 font-metrica text-[12px] text-niebla">
                <span>IMPRESIONES <strong className="text-hueso">{entero(totImp)}</strong></span>
                <span>CLICS <strong className="text-hueso">{entero(totClk)}</strong></span>
                <span>CTR <strong className="text-voltaje">{totImp ? `${decimal((totClk / totImp) * 100)} %` : '—'}</strong></span>
              </div>
              <Boton chico variante="primario" onClick={() => setCreando((v) => !v)}>{creando ? 'Cancelar' : '+ Nuevo anuncio'}</Boton>
            </div>
            {creando && <NuevoAnuncio alCrear={(a) => { setDatos({ ...datos, anuncios: [...datos.anuncios, a] }); setCreando(false); avisar('ok', 'Anuncio creado', a.anunciante); }} />}
            <table>
              <thead>
                <tr>
                  {['ANUNCIO', 'UBICACIÓN', 'IMPRESIONES', 'CLICS', 'CTR', 'ESTADO'].map((h, i) => (
                    <th key={h} className={`etiqueta px-2 py-[6px] ${i >= 2 && i <= 4 ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {datos.anuncios.map((a) => {
                  const activo = esVerdadero(a.activo);
                  return (
                    <tr key={a.id} className={`border-t border-grafito ${activo ? '' : 'opacity-60'}`}>
                      <td className="px-2 py-2"><strong className="block">{a.anunciante}</strong><span className="text-[12px] text-niebla">{a.titulo}</span></td>
                      <td className="px-2 py-2 text-[13px]">{UBICACIONES[a.ubicacion]}</td>
                      <td className="px-2 py-2 text-right font-metrica text-[13px]">{entero(a.impresiones)}</td>
                      <td className="px-2 py-2 text-right font-metrica text-[13px]">{entero(a.clics)}</td>
                      <td className="px-2 py-2 text-right font-metrica text-[13px]">{a.impresiones ? `${decimal((a.clics / a.impresiones) * 100)} %` : '—'}</td>
                      <td className="px-2 py-2"><Interruptor activo={activo} etiqueta={`Anuncio ${a.anunciante}`} alCambiar={(v) => void guardarAnuncio(a, v)} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!datos.anuncios.length && <p className="text-[13px] text-niebla">No hay anuncios todavía.</p>}
          </div>
        </>
      )}
    </div>
  );
}

function NuevoAnuncio({ alCrear }: { alCrear: (a: AnuncioAdmin) => void }) {
  const [f, setF] = useState<AnuncioAdminEntrada>({ anunciante: '', titulo: '', imagen_url: null, destino_url: null, ubicacion: 'BANNER_HOME', activo: true });
  const [error, setError] = useState<string | null>(null);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!f.anunciante.trim() || !f.titulo.trim()) return setError('Escribe el anunciante y el texto.');
    try {
      alCrear(await admin.anuncios.crear({ ...f, anunciante: f.anunciante.trim(), titulo: f.titulo.trim(), destino_url: f.destino_url?.trim() || null }));
    } catch (err) {
      setError(mensajeError(err));
    }
  }
  return (
    <form onSubmit={enviar} noValidate className="flex animate-entrada-corta flex-col gap-2 rounded border border-voltaje bg-carbon p-3">
      <div className="grid grid-cols-[1fr_1.5fr_1fr_1fr_auto] gap-2">
        <input value={f.anunciante} onChange={(e) => setF({ ...f, anunciante: e.target.value })} placeholder="Anunciante" aria-label="Anunciante" maxLength={80} className="campo" />
        <input value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} placeholder="Texto corto" aria-label="Texto" maxLength={100} className="campo" />
        <input value={f.destino_url ?? ''} onChange={(e) => setF({ ...f, destino_url: e.target.value })} placeholder="https://… (opcional)" aria-label="Enlace" maxLength={255} className="campo" />
        <select value={f.ubicacion} onChange={(e) => setF({ ...f, ubicacion: e.target.value as UbicacionAnuncio })} aria-label="Ubicación" className="campo">
          {Object.entries(UBICACIONES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <Boton type="submit" variante="claro">Crear</Boton>
      </div>
      {error && <p role="alert" className="text-[13px] text-error">{error}</p>}
    </form>
  );
}
