import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  calcularImc, clasificarImc, CLASIFICACIONES_IMC, esVerdadero, formatoNumero, MOLESTIAS, type CodigoCondicion,
} from '@fitia/shared';
import { api } from '../api';
import { useSesion } from '../auth/SesionContext';
import { Boton } from '../ui/Boton';
import { Campo, CampoNumero, Segmentado } from '../ui/Campos';
import { Aviso, Cargando, mensajeError, Proximamente } from '../ui/Estados';
import { Icono } from '../ui/Iconos';
import { iniciales } from './AppLayout';
import { rutinaActivaONula } from './Dashboard';

const num = (v: string) => parseFloat(v.replace(',', '.'));
type Msg = { tono: 'exito' | 'error'; texto: string } | null;

function Seccion({ id, titulo, sub, children }: { id?: string; titulo: string; sub?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="tarjeta flex scroll-mt-24 flex-col gap-5 p-[clamp(20px,3vw,32px)]">
      <div>
        <h2 className="font-titulo text-[clamp(28px,3vw,36px)] uppercase leading-none">{titulo}</h2>
        {sub && <p className="mt-2 text-niebla">{sub}</p>}
      </div>
      {children}
    </section>
  );
}

export function Perfil() {
  const { perfil, usuario, setPerfil, recargarPerfil, logout } = useSesion();
  const navigate = useNavigate();
  const p = perfil?.perfil;

  const [peso, setPeso] = useState('');
  const [est, setEst] = useState('');
  const [mol, setMol] = useState<CodigoCondicion[]>([]);
  const [sevLumbar, setSevLumbar] = useState<1 | 2 | 3>(1);
  const [dias, setDias] = useState(3);
  const [min, setMin] = useState(45);
  const [msgMedida, setMsgMedida] = useState<Msg>(null);
  const [msgPerfil, setMsgPerfil] = useState<Msg>(null);
  const [guardandoM, setGuardandoM] = useState(false);
  const [guardandoP, setGuardandoP] = useState(false);
  const [descarga, setDescarga] = useState<'idle' | 'cargando' | 'lista' | 'error'>('idle');

  // Rellena el formulario cuando llega (o cambia) el perfil
  useEffect(() => {
    if (!perfil) return;
    setPeso(perfil.medicion_actual.peso_kg != null ? String(perfil.medicion_actual.peso_kg) : '');
    setEst(perfil.medicion_actual.estatura_cm != null ? String(perfil.medicion_actual.estatura_cm) : '');
    setMol(perfil.condiciones.filter((c) => c.origen === 'AUTORREPORTE').map((c) => c.codigo));
    setSevLumbar((perfil.condiciones.find((c) => c.codigo === 'DOLOR_LUMBAR')?.severidad ?? 1) as 1 | 2 | 3);
    if (perfil.perfil) {
      setDias(perfil.perfil.dias_disponibles);
      setMin(perfil.perfil.minutos_por_sesion);
    }
  }, [perfil]);

  if (!perfil) return <Cargando texto="Cargando tu perfil…" />;

  const [nombres, ...resto] = (perfil.nombre ?? '').split(' ');
  const pn = num(peso);
  const en = num(est);
  const okP = pn >= 30 && pn <= 250;
  const okE = en >= 120 && en <= 220;
  const imc = okP && okE ? calcularImc(pn, en) : null;
  const plan = perfil.plan;
  const esPro = !!plan && !esVerdadero(plan.con_publicidad);
  const severidades = SEVERIDAD_OPC;

  async function guardarMedida() {
    if (!okP || !okE) return setMsgMedida({ tono: 'error', texto: 'Revisa peso (30–250 kg) y estatura (120–220 cm).' });
    setGuardandoM(true);
    setMsgMedida(null);
    try {
      const r = await api.perfil.medicion({ peso_kg: pn, estatura_cm: en });
      await recargarPerfil();
      setMsgMedida({ tono: 'exito', texto: `Medida guardada. IMC ${formatoNumero(r.medicion.imc, 2)} · ${CLASIFICACIONES_IMC[r.medicion.clasificacion].toLowerCase()}.` });
    } catch (e) {
      setMsgMedida({ tono: 'error', texto: mensajeError(e) });
    } finally {
      setGuardandoM(false);
    }
  }

  async function guardarPerfil() {
    if (!p) return navigate('/app/onboarding');
    setGuardandoP(true);
    setMsgPerfil(null);
    try {
      const nuevo = await api.perfil.actualizar({
        nivel_actividad: p.nivel_actividad,
        objetivo: p.objetivo,
        lugar_entreno: p.lugar_entreno,
        dias_disponibles: dias,
        minutos_por_sesion: min,
        condiciones: mol.map((c) => {
          const actual = perfil!.condiciones.find((x) => x.codigo === c);
          return { codigo: c, severidad: c === 'DOLOR_LUMBAR' ? sevLumbar : ((actual?.severidad ?? 1) as 1 | 2 | 3) };
        }),
      });
      setPerfil(nuevo);
      setMsgPerfil({ tono: 'exito', texto: 'Listo. Tu próxima rutina generada con IA usará estos datos.' });
    } catch (e) {
      setMsgPerfil({ tono: 'error', texto: mensajeError(e) });
    } finally {
      setGuardandoP(false);
    }
  }

  // Ley 1581: el usuario puede descargar sus datos. Se arma en el navegador con los endpoints existentes.
  async function descargar() {
    setDescarga('cargando');
    try {
      const [perf, rutina, progreso] = await Promise.all([api.perfil.obtener(), rutinaActivaONula(), api.progreso(730)]);
      const blob = new Blob(
        [JSON.stringify({ generado_en: new Date().toISOString(), fuente: 'FitIA', perfil: perf, rutina_activa: rutina, progreso }, null, 2)],
        { type: 'application/json' },
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fitia-mis-datos-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setDescarga('lista');
    } catch {
      setDescarga('error');
    }
  }

  return (
    <div className="flex animate-entrada flex-col gap-5">
      <header className="flex flex-wrap items-center gap-5">
        <span className="flex h-20 w-20 flex-none -rotate-[7deg] items-center justify-center rounded bg-hueso font-titulo text-4xl text-asfalto">{iniciales(perfil.nombre)}</span>
        <div>
          <div className="kicker">PERFIL · PLAN {(plan?.nombre ?? 'FREE').toUpperCase()}</div>
          <h1 className="mt-1 font-titulo text-[clamp(40px,5vw,64px)] uppercase leading-[.9]">{perfil.nombre}</h1>
          <div className="mt-1 text-niebla">{perfil.email}</div>
        </div>
      </header>

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-5">
          <Seccion titulo="Tus datos">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Campo etiqueta="Nombre" value={nombres ?? ''} disabled readOnly />
              <Campo etiqueta="Apellido" value={resto.join(' ')} disabled readOnly />
              <Campo etiqueta="Correo" value={perfil.email ?? usuario?.email ?? ''} disabled readOnly />
              <Campo etiqueta="Celular" value="" placeholder="—" disabled readOnly />
            </div>
            <div className="flex items-center gap-3 text-sm text-niebla">
              <Proximamente /> Por ahora estos datos se cambian desde el gimnasio.
            </div>
            <div className="h-px bg-grafito" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <CampoNumero etiqueta="Peso (kg)" valor={peso} onCambio={setPeso} unidad="kg" />
              <CampoNumero etiqueta="Estatura (cm)" valor={est} onCambio={setEst} unidad="cm" inputMode="numeric" />
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <Boton onClick={guardarMedida} cargando={guardandoM}>
                Guardar medida
              </Boton>
              <span className="font-metrica text-sm text-niebla">
                IMC CON ESTOS DATOS: <strong className="text-hueso">{imc != null ? `${formatoNumero(imc, 2)} · ${CLASIFICACIONES_IMC[clasificarImc(imc)].toUpperCase()}` : '--'}</strong>
              </span>
            </div>
            {msgMedida && <Aviso tono={msgMedida.tono}>{msgMedida.texto}</Aviso>}
          </Seccion>

          <Seccion titulo="Molestias y tiempo" sub="Si cambias algo, tu próxima rutina generada lo tendrá en cuenta. Sobrepeso y bajo peso se calculan solos con tu IMC.">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {MOLESTIAS.map((m) => {
                const on = mol.includes(m.valor);
                return (
                  <button
                    key={m.valor}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setMol((x) => (on ? x.filter((c) => c !== m.valor) : [...x, m.valor]))}
                    className={`flex min-h-[56px] items-center gap-3 rounded border-2 px-4 text-left font-semibold ${on ? 'border-voltaje bg-voltaje text-asfalto' : 'border-grafito hover:border-niebla'}`}
                  >
                    <span className={`flex h-5 w-5 flex-none items-center justify-center rounded-sm border-2 ${on ? 'border-asfalto' : 'border-grafito'}`}>
                      {on && <Icono nombre="check" tam={14} grosor={3} />}
                    </span>
                    {m.etiqueta}
                  </button>
                );
              })}
            </div>
            {mol.includes('DOLOR_LUMBAR') && (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="font-semibold">Qué tan fuerte es la molestia lumbar</span>
                <Segmentado etiqueta="Severidad lumbar" valor={sevLumbar} onCambio={setSevLumbar} opciones={severidades} />
              </div>
            )}
            <div className="flex flex-wrap gap-6">
              <div className="flex flex-col gap-2">
                <span className="text-sm font-semibold">Días por semana</span>
                <Segmentado etiqueta="Días por semana" valor={dias} onCambio={setDias} opciones={[2, 3, 4, 5, 6].map((n) => ({ valor: n, etiqueta: String(n) }))} />
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-sm font-semibold">Minutos por sesión</span>
                <Segmentado etiqueta="Minutos por sesión" valor={min} onCambio={setMin} opciones={[30, 45, 60, 90].map((n) => ({ valor: n, etiqueta: String(n) }))} />
              </div>
            </div>
            <Boton className="self-start" onClick={guardarPerfil} cargando={guardandoP}>
              Actualizar mis datos
            </Boton>
            {msgPerfil && <Aviso tono={msgPerfil.tono}>{msgPerfil.texto}</Aviso>}
          </Seccion>

          <Seccion titulo="Cambiar contraseña">
            <fieldset disabled className="m-0 grid grid-cols-1 gap-4 border-0 p-0 sm:grid-cols-3">
              <Campo etiqueta="Actual" type="password" />
              <Campo etiqueta="Nueva" type="password" />
              <Campo etiqueta="Repite la nueva" type="password" />
            </fieldset>
            <div className="flex items-center gap-3">
              <Boton disabled>Cambiar contraseña</Boton>
              <Proximamente />
            </div>
          </Seccion>
        </div>

        <div className="flex flex-col gap-5">
          <Seccion titulo={`Plan ${esPro ? 'Pro' : 'Free'}`}>
            <p className="text-niebla">
              {esPro
                ? `Sin anuncios y ${plan?.rutinas_ia_mes} rutinas IA al mes.`
                : `${plan?.rutinas_ia_mes ?? 2} rutinas IA al mes, con publicidad.`}{' '}
              Te {perfil.cupo_ia_restante === 1 ? 'queda 1' : `quedan ${perfil.cupo_ia_restante}`} este mes.
            </p>
            <Boton variante={esPro ? 'secundario' : 'primario'} onClick={() => navigate('/app/planes')}>
              {esPro ? 'Ver mi plan' : 'Pásate a Pro'}
            </Boton>
          </Seccion>

          <Seccion id="datos" titulo="Tus datos, tus reglas" sub="Por la Ley 1581 de 2012 puedes conocer, descargar, corregir o borrar tu información cuando quieras.">
            <div className="flex flex-col gap-2 border-t border-grafito pt-4">
              <span className="font-semibold">Descargar mis datos</span>
              <span className="text-sm text-niebla">Perfil, medidas, rutina activa y progreso en un archivo JSON.</span>
              <Boton variante="secundario" tam="sm" className="mt-1 self-start" onClick={descargar} cargando={descarga === 'cargando'}>
                <Icono nombre="descarga" tam={18} />
                {descarga === 'lista' ? 'Descargado · otra vez' : 'Descargar JSON'}
              </Boton>
              {descarga === 'error' && <span className="text-sm text-error">No pudimos armar el archivo. Intenta de nuevo.</span>}
            </div>
            <div className="flex flex-col gap-2 border-t border-grafito pt-4">
              <span className="font-semibold">Borrar mis datos</span>
              <span className="text-sm text-niebla">Eliminamos tu cuenta y todo tu historial. No se puede deshacer.</span>
              <div className="mt-1 flex items-center gap-3">
                <Boton variante="peligro" tam="sm" disabled>
                  Borrar mis datos
                </Boton>
                <Proximamente />
              </div>
              <span className="text-sm text-niebla">Mientras tanto, pídeselo al administrador de tu gimnasio.</span>
            </div>
          </Seccion>

          <Boton
            variante="fantasma"
            className="self-start"
            onClick={() => {
              logout();
              navigate('/');
            }}
          >
            <Icono nombre="salir" /> Cerrar sesión
          </Boton>
        </div>
      </div>
    </div>
  );
}

const SEVERIDAD_OPC: { valor: 1 | 2 | 3; etiqueta: string }[] = [
  { valor: 1, etiqueta: 'Leve' },
  { valor: 2, etiqueta: 'Moderada' },
  { valor: 3, etiqueta: 'Fuerte' },
];
