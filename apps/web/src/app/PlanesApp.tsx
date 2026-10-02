import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { esVerdadero, formatoCop, luhnValido, type MetodoPago, type Pago } from '@fitia/shared';
import { api } from '../api';
import { useSesion } from '../auth/SesionContext';
import { ListaBeneficios, usePlanes, usePrecioPro } from '../publico/Planes';
import { fechaCorta } from '../lib/rutina';
import { Boton } from '../ui/Boton';
import { Campo, Segmentado } from '../ui/Campos';
import { Aviso, mensajeError, Proximamente } from '../ui/Estados';
import { Icono } from '../ui/Iconos';

const METODOS: { v: MetodoPago; l: string; icono: string }[] = [
  { v: 'TARJETA', l: 'Tarjeta', icono: 'M3 6h18v12H3zM3 10h18M7 15h4' },
  { v: 'PSE', l: 'PSE', icono: 'M4 10l8-5 8 5M6 10v8M10 10v8M14 10v8M18 10v8M3 20h18' },
  { v: 'NEQUI', l: 'Nequi', icono: 'M7 2h10v20H7zM11 18h2' },
];
const BANCOS = ['Bancolombia', 'Davivienda', 'Banco de Bogotá', 'BBVA Colombia', 'Banco Caja Social', 'Banco Popular', 'Nequi', 'Daviplata'];

const formatoTarjeta = (v: string) => v.replace(/\D/g, '').slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ');
const formatoVence = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
};

function BannerDemo() {
  return (
    <div role="note" className="flex items-center gap-3 rounded border-2 border-advertencia bg-advertencia/10 px-4 py-3 font-semibold text-advertencia">
      <Icono nombre="alerta" tam={20} className="flex-none" />
      Modo demostración: no se realizan cobros reales.
    </div>
  );
}

type Paso = 'planes' | 'pagar' | 'procesando' | 'aprobado' | 'rechazado';

export function PlanesApp() {
  const { perfil, recargarPerfil } = useSesion();
  const navigate = useNavigate();
  const [anual, setAnual] = useState(false);
  const pro = usePrecioPro(anual);
  const { cargado } = usePlanes();
  const [paso, setPaso] = useState<Paso>('planes');
  const [metodo, setMetodo] = useState<MetodoPago>('TARJETA');
  const [num, setNum] = useState('');
  const [nom, setNom] = useState('');
  const [vence, setVence] = useState('');
  const [cvv, setCvv] = useState('');
  const [banco, setBanco] = useState('');
  const [persona, setPersona] = useState<'Natural' | 'Jurídica'>('Natural');
  const [doc, setDoc] = useState('');
  const [cel, setCel] = useState('');
  const [intento, setIntento] = useState(false);
  const [pago, setPago] = useState<Pago | null>(null);
  const [error, setError] = useState<string | null>(null);

  const plan = perfil?.plan;
  const esPro = !!plan && !esVerdadero(plan.con_publicidad);
  const precio = pro.plan?.precio_cop ?? 0;
  const iva = precio - precio / 1.19;

  const dig = num.replace(/\D/g, '');
  const okNum = luhnValido(dig);
  const okNom = nom.trim().length > 2;
  const okV = (() => {
    const m = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(vence);
    if (!m) return false;
    const fin = new Date(2000 + Number(m[2]), Number(m[1]), 0);
    return fin >= new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  })();
  const okC = /^\d{3,4}$/.test(cvv);
  const okB = !!banco;
  const okD = /^\d{6,10}$/.test(doc);
  const okCel = /^3\d{9}$/.test(cel.replace(/\D/g, ''));
  const valido = metodo === 'TARJETA' ? okNum && okNom && okV && okC : metodo === 'PSE' ? okB && okD : okCel;
  const err = (malo: boolean, msg: string) => intento && malo && msg;

  async function pagar(e: FormEvent) {
    e.preventDefault();
    setIntento(true);
    setError(null);
    if (!valido || !pro.plan) return;
    setPaso('procesando');
    try {
      // Solo viaja el número (el backend valida Luhn y guarda los últimos 4). Nombre, vencimiento y CVV nunca se envían.
      const [r] = await Promise.all([
        api.pagos.simular({ plan_codigo: pro.plan.codigo, metodo, ...(metodo === 'TARJETA' ? { numero_tarjeta: dig } : {}) }),
        new Promise((res) => setTimeout(res, 1400)),
      ]);
      setPago(r);
      setPaso(r.estado === 'APROBADO' ? 'aprobado' : 'rechazado');
      setCvv('');
      if (r.estado === 'APROBADO') await recargarPerfil();
    } catch (ex) {
      setError(mensajeError(ex));
      setPaso('pagar');
    }
  }

  if (paso === 'procesando')
    return (
      <div className="flex min-h-[60vh] flex-col items-start justify-center gap-5" role="status" aria-live="polite">
        <BannerDemo />
        <span className="h-12 w-12 animate-spin border-4 border-voltaje border-t-transparent" aria-hidden />
        <h1 className="font-titulo text-[clamp(40px,5vw,64px)] uppercase leading-[.9]">Procesando tu pago…</h1>
        <p className="text-niebla">No cierres esta pantalla. (Demo: no se cobra nada.)</p>
      </div>
    );

  if (paso === 'aprobado' && pago)
    return (
      <div className="flex animate-entrada flex-col items-start gap-6">
        <BannerDemo />
        <span className="flex h-[88px] w-[88px] -rotate-[7deg] items-center justify-center rounded bg-voltaje text-asfalto">
          <Icono nombre="check" tam={44} grosor={2.5} />
        </span>
        <h1 className="font-titulo text-[clamp(48px,7vw,104px)] uppercase leading-[.88]">¡Ya eres Pro!</h1>
        <p className="text-lg">
          Tienes {pago.suscripcion?.rutinas_ia_mes ?? 10} rutinas IA este mes y ya no verás anuncios.
        </p>
        <dl className="grid w-full max-w-[560px] grid-cols-2 gap-px overflow-hidden rounded border border-grafito bg-grafito">
          {[
            ['REFERENCIA', pago.referencia],
            ['MEDIO', `${pago.metodo}${pago.ultimos4 ? ` ···· ${pago.ultimos4}` : ''}`],
            ['VALOR', `${formatoCop(pago.monto_cop)} (simulado)`],
            ['VIGENTE HASTA', pago.suscripcion?.fecha_fin ? fechaCorta(pago.suscripcion.fecha_fin) : '—'],
          ].map(([k, v]) => (
            <div key={k} className="bg-concreto p-4">
              <dt className="text-[11px] font-bold tracking-[.08em] text-niebla">{k}</dt>
              <dd className="m-0 mt-1 cifra font-bold">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="text-sm text-niebla">{pago.aviso}</p>
        <Boton onClick={() => navigate('/app')}>Ir al inicio</Boton>
      </div>
    );

  if (paso === 'rechazado' && pago)
    return (
      <div className="flex animate-entrada flex-col items-start gap-6">
        <BannerDemo />
        <span className="flex h-[88px] w-[88px] -rotate-[7deg] items-center justify-center rounded bg-error text-asfalto">
          <Icono nombre="cerrar" tam={44} grosor={2.5} />
        </span>
        <h1 className="font-titulo text-[clamp(44px,6vw,88px)] uppercase leading-[.9]">Tu pago fue rechazado</h1>
        <p className="max-w-[560px] text-lg">
          {pago.motivo_rechazo ?? 'El banco no autorizó la transacción.'} No se hizo ningún cobro y sigues en {plan?.nombre ?? 'Free'}.
        </p>
        <p className="font-metrica text-sm text-niebla">REFERENCIA {pago.referencia}</p>
        <div className="flex flex-wrap gap-3">
          <Boton onClick={() => (setPaso('pagar'), setIntento(false))}>Intentar otra vez</Boton>
          <Boton variante="secundario" onClick={() => (setMetodo('PSE'), setPaso('pagar'), setIntento(false))}>
            Usar PSE o Nequi
          </Boton>
        </div>
      </div>
    );

  if (paso === 'pagar')
    return (
      <div className="flex animate-entrada flex-col gap-5">
        <BannerDemo />
        <button onClick={() => setPaso('planes')} className="inline-flex min-h-[44px] items-center gap-2 self-start rounded px-2 font-semibold text-niebla hover:bg-concreto hover:text-hueso">
          <Icono nombre="atras" /> Planes
        </button>
        <h1 className="font-titulo text-[clamp(40px,5vw,72px)] uppercase leading-[.9]">Pagar FitIA Pro</h1>
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <form onSubmit={pagar} noValidate className="tarjeta flex flex-col gap-5 p-6">
            <div role="radiogroup" aria-label="Medio de pago" className="grid grid-cols-3 gap-2">
              {METODOS.map((m) => (
                <button
                  key={m.v}
                  type="button"
                  role="radio"
                  aria-checked={metodo === m.v}
                  onClick={() => (setMetodo(m.v), setIntento(false))}
                  className={`flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded border-2 font-semibold ${
                    metodo === m.v ? 'border-voltaje bg-voltaje text-asfalto' : 'border-grafito hover:border-niebla'
                  }`}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" aria-hidden>
                    <path d={m.icono} />
                  </svg>
                  {m.l}
                </button>
              ))}
            </div>

            {error && <Aviso tono="error">{error}</Aviso>}

            {metodo === 'TARJETA' && (
              <>
                <Campo
                  etiqueta="Número de tarjeta"
                  inputMode="numeric"
                  autoComplete="off"
                  value={num}
                  onChange={(e) => setNum(formatoTarjeta(e.target.value))}
                  placeholder="4111 1111 1111 1111"
                  className="[&_input]:font-metrica"
                  ok={dig.length >= 13 && okNum}
                  error={err(!okNum, dig.length < 13 ? 'Escribe el número completo de la tarjeta.' : 'Revisa los dígitos: el número no es válido.')}
                  ayuda="Prueba: 4111 1111 1111 1111 se aprueba; 4242 4242 4242 0000 (terminada en 0000) simula un rechazo."
                />
                <Campo etiqueta="Nombre como aparece en la tarjeta" autoComplete="off" value={nom} onChange={(e) => setNom(e.target.value)} error={err(!okNom, 'Escribe el nombre de la tarjeta.')} />
                <div className="grid grid-cols-2 gap-4">
                  <Campo etiqueta="Vence" inputMode="numeric" autoComplete="off" placeholder="MM/AA" value={vence} onChange={(e) => setVence(formatoVence(e.target.value))} error={err(!okV, 'Fecha no válida o vencida.')} />
                  <Campo etiqueta="CVV" inputMode="numeric" autoComplete="off" type="password" placeholder="123" value={cvv} onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))} error={err(!okC, '3 o 4 dígitos.')} />
                </div>
              </>
            )}

            {metodo === 'PSE' && (
              <>
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-semibold">Banco</span>
                  <select
                    value={banco}
                    onChange={(e) => setBanco(e.target.value)}
                    className={`min-h-[52px] rounded border-2 bg-carbon px-3 text-base text-hueso ${intento && !okB ? 'border-error' : 'border-grafito'}`}
                  >
                    <option value="">Elige tu banco</option>
                    {BANCOS.map((b) => (
                      <option key={b}>{b}</option>
                    ))}
                  </select>
                  {intento && !okB && <span className="text-sm text-error">Elige tu banco.</span>}
                </label>
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-semibold">Tipo de persona</span>
                  <Segmentado etiqueta="Tipo de persona" valor={persona} onCambio={setPersona} opciones={[{ valor: 'Natural', etiqueta: 'Natural' }, { valor: 'Jurídica', etiqueta: 'Jurídica' }]} />
                </div>
                <Campo etiqueta="Número de documento" inputMode="numeric" value={doc} onChange={(e) => setDoc(e.target.value.replace(/\D/g, '').slice(0, 10))} error={err(!okD, 'Entre 6 y 10 dígitos.')} />
                <p className="text-sm text-niebla">Te llevaríamos a la página de tu banco para aprobar el pago. En la demo, se aprueba al instante.</p>
              </>
            )}

            {metodo === 'NEQUI' && (
              <>
                <Campo
                  etiqueta="Celular registrado en Nequi"
                  inputMode="numeric"
                  value={cel}
                  onChange={(e) => setCel(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="3001234567"
                  derecha={<span className="order-first flex items-center pl-4 font-metrica text-niebla">+57</span>}
                  error={err(!okCel, 'Escribe un celular de 10 dígitos que empiece por 3.')}
                />
                <p className="text-sm text-niebla">Te llegaría una notificación en la app Nequi para aceptar el pago.</p>
              </>
            )}

            {intento && !valido && <span role="alert" className="text-sm text-error">Revisa los campos en rojo para continuar.</span>}
            <Boton type="submit" tam="lg" disabled={!cargado}>
              Pagar {pro.precio} (simulado)
            </Boton>
          </form>

          <aside className="tarjeta flex flex-col gap-4 p-6">
            <span className="font-metrica text-xs tracking-[.06em] text-niebla">RESUMEN</span>
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-semibold">FitIA Pro · {anual ? 'anual' : 'mensual'}</span>
              <span className="cifra">{pro.precio}</span>
            </div>
            <div className="flex items-baseline justify-between gap-3 text-niebla">
              <span>IVA incluido (19 %)</span>
              <span className="cifra">{formatoCop(Math.round(iva))}</span>
            </div>
            <div className="flex items-baseline justify-between gap-3 border-t border-grafito pt-4">
              <span className="font-bold">TOTAL</span>
              <span className="cifra text-[28px] font-bold text-voltaje">{pro.precio}</span>
            </div>
            <Segmentado etiqueta="Periodo" valor={anual ? 'a' : 'm'} onCambio={(v) => setAnual(v === 'a')} opciones={[{ valor: 'm', etiqueta: 'Mensual' }, { valor: 'a', etiqueta: 'Anual · −17%' }]} />
            <p className="text-sm text-niebla">Pago único simulado: no hay cobros recurrentes. Al terminar el periodo vuelves a Free sin perder tu historial.</p>
          </aside>
        </div>
      </div>
    );

  return (
    <div className="flex animate-entrada flex-col gap-5">
      <BannerDemo />
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="kicker">PLANES · TU PLAN: {(plan?.nombre ?? 'FitIA Free').toUpperCase()}</div>
          <h1 className="mt-2 font-titulo text-[clamp(40px,5vw,72px)] uppercase leading-[.9]">
            {esPro ? (
              <>
                Eres Pro.
                <br />
                <span className="text-voltaje">Dale con todo.</span>
              </>
            ) : (
              <>
                Free ya es completo.
                <br />
                <span className="text-voltaje">Pro, si quieres más.</span>
              </>
            )}
          </h1>
        </div>
        <Segmentado etiqueta="Periodo de pago" valor={anual ? 'a' : 'm'} onCambio={(v) => setAnual(v === 'a')} opciones={[{ valor: 'm', etiqueta: 'Mensual' }, { valor: 'a', etiqueta: 'Anual · −17%' }]} />
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className={`relative flex flex-col gap-5 overflow-hidden rounded border-2 bg-concreto px-7 pb-7 pt-12 ${esPro ? 'border-grafito' : 'border-voltaje shadow-[8px_8px_0_#D4FF00]'}`}>
          {!esPro && <span className="absolute right-4 top-4 rounded-sm bg-voltaje px-2 py-1 etiqueta text-asfalto">TU PLAN</span>}
          <div className="font-titulo text-4xl leading-none">FITIA FREE</div>
          <div className="flex items-baseline gap-2">
            <span className="cifra text-[48px] font-bold leading-none tracking-[-.04em] text-voltaje">$0</span>
            <span className="text-[15px] text-niebla">para siempre</span>
          </div>
          <ListaBeneficios plan="free" />
          {esPro && (
            <div className="flex items-center gap-3">
              <Boton variante="secundario" disabled>
                Volver a Free (demo)
              </Boton>
              <Proximamente />
            </div>
          )}
        </div>
        <div className={`relative flex flex-col gap-5 overflow-hidden rounded border-2 bg-concreto px-7 pb-7 pt-12 ${esPro ? 'border-voltaje shadow-[8px_8px_0_#D4FF00]' : 'border-grafito'}`}>
          <div className="cinta absolute inset-x-0 top-0 h-5" />
          {esPro && <span className="absolute right-4 top-8 rounded-sm bg-voltaje px-2 py-1 etiqueta text-asfalto">TU PLAN</span>}
          <div className="font-titulo text-4xl leading-none">FITIA PRO</div>
          <div className="flex flex-col gap-1">
            <div className="flex items-baseline gap-2">
              <span className="cifra text-[48px] font-bold leading-none tracking-[-.04em]">{pro.precio}</span>
              <span className="text-[15px] text-niebla">{pro.periodo}</span>
            </div>
            <span className="text-sm text-voltaje">{pro.nota}</span>
          </div>
          <ListaBeneficios plan="pro" />
          {esPro ? (
            <div className="rounded border border-exito bg-exito/10 px-4 py-3 text-sm font-semibold text-exito">
              Activo{plan?.fecha_fin ? ` hasta el ${fechaCorta(plan.fecha_fin)}` : ''} · sin cobros recurrentes (simulado)
            </div>
          ) : (
            <Boton onClick={() => setPaso('pagar')} disabled={!cargado}>
              Pasarme a Pro
            </Boton>
          )}
        </div>
      </div>
    </div>
  );
}
