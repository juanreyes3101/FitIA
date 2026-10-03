import { useState } from 'react';
import { admin, cambiarApiUrl, obtenerApiUrl, probarApi } from '../api';
import { useDatos } from '../hooks/useDatos';
import { decimal, hora } from '../lib/formato';
import { useSesion } from '../sesion/SesionContext';
import { Boton } from '../ui/Boton';
import { Cargando, ErrorEstado, mensajeError } from '../ui/Estados';
import { useToast } from '../ui/Toasts';

// Mismo orden de reglas que backend/app/monitoring/politicas.py
const POLITICAS: Record<string, string> = {
  api: 'Latencia, RPS o CPU alta → escalar +1 réplica · errores → reiniciar worker',
  web: 'Latencia, RPS o CPU alta → escalar +1 réplica · errores → reiniciar worker',
  ia: 'Latencia o errores → pasar a Mock mientras siga la anomalía',
  db: 'Cualquier anomalía → avisar al administrador',
};

export default function Configuracion() {
  const { usuario } = useSesion();
  const esAdmin = usuario?.rol === 'ADMIN';
  return (
    <div className="flex animate-entrada flex-col gap-[14px]">
      <header>
        <div className="kicker">CONEXIÓN · DETECTOR · POLÍTICAS</div>
        <h1 className="titulo-pagina">Configuración</h1>
      </header>
      <div className={`grid gap-[10px] ${esAdmin ? 'grid-cols-[minmax(0,1fr)_minmax(0,1fr)]' : 'grid-cols-1'}`}>
        <Conexion />
        {esAdmin && <Detector />}
      </div>
      {esAdmin && <Politicas />}
    </div>
  );
}

function Conexion() {
  const avisar = useToast();
  const [url, setUrl] = useState(obtenerApiUrl());
  const [prueba, setPrueba] = useState<{ ok: boolean; mensaje: string } | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function guardar() {
    setOcupado(true);
    const r = await probarApi(url);
    setPrueba(r);
    if (r.ok) {
      try {
        setUrl(await cambiarApiUrl(url));
        avisar('ok', 'Servidor guardado', 'Las próximas peticiones van a esta dirección');
      } catch (e) {
        setPrueba({ ok: false, mensaje: mensajeError(e) });
      }
    }
    setOcupado(false);
  }

  return (
    <section className="panel flex flex-col gap-3 p-4">
      <span className="titulo-panel">CONEXIÓN CON LA API</span>
      <label className="flex flex-col gap-[6px]">
        <span className="text-[13px] font-semibold">URL de la API</span>
        <input value={url} onChange={(e) => { setUrl(e.target.value); setPrueba(null); }} spellCheck={false} className="campo font-metrica text-[13px]" />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <Boton variante="claro" onClick={() => void guardar()} disabled={ocupado || !url.trim()}>{ocupado ? 'Probando…' : 'Probar y guardar'}</Boton>
        <Boton variante="fantasma" onClick={() => void probarApi(url).then(setPrueba)}>Solo probar</Boton>
        {prueba && <span className={`text-[13px] ${prueba.ok ? 'text-exito' : 'text-error'}`}>{prueba.mensaje}</span>}
      </div>
      <p className="text-[12px] text-niebla">
        Por defecto <span className="font-metrica">http://localhost:5000/api/v1</span>. Desde otra PC de la red usa la IP de la que corre la API.
        La URL se guarda en este equipo; las llaves de la IA nunca salen de <span className="font-metrica">backend/.env</span>.
      </p>
    </section>
  );
}

function Detector() {
  const { datos, cargando, error, recargar } = useDatos(() => admin.monitoreo.estado(), []);
  if (cargando && !datos) return <div className="panel"><Cargando /></div>;
  if (error || !datos) return <ErrorEstado error={error} reintentar={recargar} />;
  const filas: [string, string][] = [
    ['Umbral z-score', `z > ${decimal(datos.umbral_z)}σ`],
    ['Umbral de tasa de error', `${decimal(datos.umbral_error * 100)} %`],
    ['Ciclo del worker', `cada ${datos.intervalo_seg} s`],
    ['Ventana de la línea base', `${datos.ventana_min} min`],
    ['Enfriamiento entre acciones', `${datos.enfriamiento_seg} s`],
    ['Proveedor de IA', `${datos.ia.configurado === 'gemini' ? 'Gemini' : 'Mock'} (configurado) · ${datos.ia.efectivo === 'gemini' ? 'Gemini' : 'Mock'} (en uso)`],
    ['Circuit breaker de la IA', datos.ia.circuit_breaker],
    ['Worker MAPE-K', datos.worker.activo ? `activo · último ciclo ${datos.worker.ultimo_ciclo ? hora(datos.worker.ultimo_ciclo) : '—'}` : 'detenido'],
  ];
  return (
    <section className="panel flex flex-col gap-3 p-4">
      <span className="titulo-panel">DETECTOR DE ANOMALÍAS E IA</span>
      <dl className="flex flex-col">
        {filas.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3 border-t border-grafito py-2 text-[13px]">
            <dt className="text-niebla">{k}</dt>
            <dd className={`text-right font-metrica ${k === 'Worker MAPE-K' && !datos.worker.activo ? 'text-advertencia' : ''}`}>{v}</dd>
          </div>
        ))}
      </dl>
      <div className="rounded border border-grafito bg-asfalto p-[10px] font-metrica text-[12px] text-niebla">
        z = (x − μ) / σ · alerta si z &gt; <span className="text-voltaje">{decimal(datos.umbral_z)}</span> en la media del último ciclo · μ (EWMA α = 0,3) y σ sobre los últimos <span className="text-voltaje">{datos.ventana_min}</span> min, sin los tramos de incidentes
      </div>
      <p className="text-[12px] text-niebla">Se cambian en <span className="font-metrica">backend/.env</span> (MONITOR_*, AI_PROVIDER) y se aplican al reiniciar la API y el worker. Editarlos desde aquí: <em>Próximamente</em>.</p>
    </section>
  );
}

function Politicas() {
  const { datos, error, recargar } = useDatos(() => admin.monitoreo.servicios(), []);
  return (
    <section className="panel flex flex-col gap-3 p-4">
      <div className="flex items-baseline justify-between">
        <span className="titulo-panel">POLÍTICAS DE REMEDIACIÓN</span>
        <span className="text-[12px] font-bold text-exito">AUTOMÁTICA · SIMULADA</span>
      </div>
      {error ? <ErrorEstado error={error} reintentar={recargar} compacto /> : (
        <table>
          <thead>
            <tr>{['SERVICIO', 'ACCIÓN ANTE ANOMALÍA', 'MÍN.', 'MÁX.', 'ACTUALES'].map((h, i) => (
              <th key={h} className={`etiqueta px-2 py-[6px] ${i >= 2 ? 'text-center' : 'text-left'}`}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {(datos ?? []).map((s) => (
              <tr key={s.codigo} className="border-t border-grafito">
                <td className="px-2 py-2 font-semibold">{s.nombre}</td>
                <td className="px-2 py-2 text-[13px] text-niebla">{POLITICAS[s.codigo] ?? POLITICAS.db}</td>
                <td className="px-2 py-2 text-center font-metrica">{s.replicas_min}</td>
                <td className="px-2 py-2 text-center font-metrica">{s.replicas_max}</td>
                <td className="px-2 py-2 text-center font-metrica text-voltaje">{s.replicas_actuales}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="text-[12px] text-niebla">Severidad CRÍTICA → además avisa al administrador. Con réplicas al máximo, solo avisa. Tras mitigar y pasado el enfriamiento, devuelve una réplica por ciclo. Los límites viven en la tabla <span className="font-metrica">servicios</span>.</p>
    </section>
  );
}
