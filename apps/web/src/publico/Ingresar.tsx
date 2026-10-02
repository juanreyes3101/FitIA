import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSesion } from '../auth/SesionContext';
import { Boton, BotonLink } from '../ui/Boton';
import { Campo, Casilla } from '../ui/Campos';
import { Aviso, mensajeError } from '../ui/Estados';
import { Icono } from '../ui/Iconos';

const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.trim());

function fuerza(pw: string) {
  const n = pw.length;
  const score = n === 0 ? 0 : n < 8 ? 1 : /\d/.test(pw) && /[A-Za-z]/.test(pw) ? (n >= 12 ? 4 : 3) : 2;
  const msg =
    n === 0
      ? 'Mínimo 8 caracteres. Mezcla letras y números.'
      : score <= 1
        ? `Te faltan ${8 - n} caracteres.`
        : score === 2
          ? 'Bien. Agrégale un número para hacerla más fuerte.'
          : score === 3
            ? 'Fuerte.'
            : 'Muy fuerte. ¡Así es!';
  const color = score <= 1 ? '#FF3B3B' : score === 2 ? '#FFB020' : '#3DDC84';
  return { score, msg, color };
}

export function Ingresar() {
  const { hash, state } = useLocation();
  const navigate = useNavigate();
  const { login, registro, estado } = useSesion();
  const [reg, setReg] = useState(hash === '#registro');
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [verPw, setVerPw] = useState(false);
  const [terminos, setTerminos] = useState(false);
  const [datos, setDatos] = useState(false);
  const [intento, setIntento] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [soloEscritorio, setSoloEscritorio] = useState(false);

  useEffect(() => setReg(hash === '#registro'), [hash]);
  useEffect(() => {
    if (estado === 'autenticado') navigate('/app', { replace: true });
  }, [estado, navigate]);

  const cambiarModo = (r: boolean) => {
    setReg(r);
    setIntento(false);
    setError(null);
    navigate(r ? '/ingresar#registro' : '/ingresar', { replace: true, state });
  };

  const f = fuerza(pw);
  const err = (malo: boolean) => intento && malo;
  const malNombre = !nombres.trim();
  const malApellido = !apellidos.trim();
  const malEmail = !emailOk(email);
  const malPw = reg ? pw.length < 8 : !pw;
  const malLegal = !(terminos && datos);
  const valido = !malEmail && !malPw && (!reg || (!malNombre && !malApellido && !malLegal));

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setIntento(true);
    setError(null);
    if (!valido) return;
    setEnviando(true);
    try {
      const r = reg
        ? await registro({ nombres: nombres.trim(), apellidos: apellidos.trim(), email: email.trim(), password: pw, acepta_terminos: true })
        : await login(email.trim(), pw);
      if (r.usuario.rol !== 'USUARIO') {
        setSoloEscritorio(true);
        return;
      }
      navigate(r.tienePerfil ? '/app' : '/app/onboarding', { replace: true, state });
    } catch (ex) {
      setError(mensajeError(ex));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="grid grid-cols-1 min-h-screen lg:grid-cols-2">
      <div className="duotono relative isolate min-h-[clamp(320px,50vw,100vh)] overflow-hidden">
        <div className="grano absolute inset-0 opacity-[.1]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 p-[clamp(20px,4vw,56px)]">
          <div className="inline-block rounded bg-asfalto px-6 pb-4 pt-5">
            <div className="font-titulo text-[clamp(56px,7vw,112px)] uppercase leading-[.85]">
              Arranca
              <br />
              <span className="text-voltaje">hoy.</span>
            </div>
          </div>
          <div className="cinta -mx-[clamp(20px,4vw,56px)] mt-4 h-5" />
        </div>
      </div>

      <div className="flex justify-center px-4 pb-16 pt-[clamp(40px,8vw,128px)] sm:px-[clamp(16px,4vw,56px)]">
        <div className="flex w-full max-w-[460px] flex-col gap-7">
          {soloEscritorio ? (
            <div className="flex animate-entrada flex-col gap-6">
              <span className="flex h-[72px] w-[72px] -rotate-[7deg] items-center justify-center rounded bg-voltaje text-asfalto">
                <Icono nombre="perfil" tam={36} />
              </span>
              <h1 className="font-titulo text-[clamp(44px,5vw,64px)] uppercase leading-[.9]">Usa FitIA Control</h1>
              <p className="text-[17px] text-niebla">
                Tu cuenta es de administrador o entrenador. Esa gestión se hace desde la aplicación de escritorio{' '}
                <strong className="text-hueso">FitIA Control</strong>. La web es para quienes entrenan.
              </p>
              <Boton variante="secundario" onClick={() => setSoloEscritorio(false)}>
                Volver al formulario
              </Boton>
            </div>
          ) : (
            <>
              <div role="tablist" aria-label="Tipo de acceso" className="grid grid-cols-2 overflow-hidden rounded border-2 border-grafito">
                {[
                  [false, 'Ingresar'],
                  [true, 'Crear cuenta'],
                ].map(([r, t]) => (
                  <button
                    key={t as string}
                    role="tab"
                    aria-selected={reg === r}
                    onClick={() => cambiarModo(r as boolean)}
                    className={`min-h-[52px] text-base font-semibold ${reg === r ? 'bg-voltaje text-asfalto' : 'text-hueso hover:bg-concreto'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div>
                <h1 className="font-titulo text-[clamp(44px,4.4vw,64px)] font-normal uppercase leading-[.92]">
                  {reg ? 'Crea tu cuenta' : 'Qué bueno verte'}
                </h1>
                <p className="mt-2.5 text-[17px] text-niebla">
                  {reg ? 'Gratis, sin tarjeta. En 2 minutos tienes tu rutina.' : 'Ingresa y sigue con tu rutina.'}
                </p>
              </div>

              {error && <Aviso tono="error">{error}</Aviso>}

              <form onSubmit={enviar} noValidate className="flex flex-col gap-5">
                {reg && (
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <Campo
                      etiqueta="Nombre"
                      value={nombres}
                      onChange={(e) => setNombres(e.target.value)}
                      autoComplete="given-name"
                      placeholder="¿Cómo te decimos?"
                      error={err(malNombre) && 'Escribe tu nombre.'}
                    />
                    <Campo
                      etiqueta="Apellidos"
                      value={apellidos}
                      onChange={(e) => setApellidos(e.target.value)}
                      autoComplete="family-name"
                      placeholder="Tus apellidos"
                      error={err(malApellido) && 'Escribe tus apellidos.'}
                    />
                  </div>
                )}
                <Campo
                  etiqueta="Correo"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="tucorreo@ejemplo.com"
                  ok={!!email && !malEmail}
                  error={err(malEmail) && (email ? 'Revisa el correo: le falta la @ o el dominio.' : 'Escribe tu correo.')}
                />
                <div className="flex flex-col gap-2">
                  <Campo
                    etiqueta="Contraseña"
                    type={verPw ? 'text' : 'password'}
                    value={pw}
                    onChange={(e) => setPw(e.target.value)}
                    autoComplete={reg ? 'new-password' : 'current-password'}
                    placeholder={reg ? 'Mínimo 8 caracteres' : 'Tu contraseña'}
                    error={!reg && err(malPw) && 'Escribe tu contraseña.'}
                    derecha={
                      <button
                        type="button"
                        onClick={() => setVerPw((v) => !v)}
                        aria-label={verPw ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        className="flex w-12 items-center justify-center text-niebla hover:text-hueso"
                      >
                        <Icono nombre={verPw ? 'ojoNo' : 'ojo'} />
                      </button>
                    }
                  />
                  {reg && (
                    <>
                      <div className="flex gap-1" aria-hidden>
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} className="h-1 flex-1 transition-colors" style={{ background: i <= f.score ? f.color : '#2A2A2E' }} />
                        ))}
                      </div>
                      <span className="text-sm" style={{ color: err(malPw) ? '#FF3B3B' : '#9A9AA0' }}>
                        {f.msg}
                      </span>
                    </>
                  )}
                </div>
                {reg && (
                  <div className={`flex flex-col gap-1 rounded border p-4 ${err(malLegal) ? 'border-error' : 'border-grafito'}`}>
                    <Casilla marcada={terminos} onCambio={setTerminos} error={err(!terminos)}>
                      <strong>Acepto los términos y condiciones de FitIA.</strong>{' '}
                      <span className="etiqueta text-niebla">OBLIGATORIO</span>
                    </Casilla>
                    <Casilla marcada={datos} onCambio={setDatos} error={err(!datos)}>
                      <strong>
                        Autorizo el tratamiento de mis datos personales (incluidos peso, estatura y molestias) según la Ley 1581 de
                        2012 y la política de datos de FitIA.
                      </strong>{' '}
                      <span className="etiqueta text-niebla">OBLIGATORIO</span>
                    </Casilla>
                    {err(malLegal) && (
                      <span className="pt-1 text-sm text-error">
                        Para crear tu cuenta necesitamos que aceptes los términos y el tratamiento de datos.
                      </span>
                    )}
                  </div>
                )}
                <Boton type="submit" tam="lg" cargando={enviando} className={intento && !valido ? 'opacity-70' : ''}>
                  {reg ? 'Crear mi cuenta' : 'Ingresar'}
                </Boton>
              </form>
              <p className="text-center text-[15px] text-niebla">
                {reg ? '¿Ya tienes cuenta?' : '¿Aún no tienes cuenta?'}{' '}
                <button
                  onClick={() => cambiarModo(!reg)}
                  className="min-h-[44px] px-1 text-[15px] font-semibold text-voltaje underline underline-offset-4 hover:text-hueso"
                >
                  {reg ? 'Ingresa' : 'Créala gratis'}
                </button>
              </p>
              {!reg && (
                <p className="text-center text-sm text-niebla">
                  ¿Solo quieres medirte? <Link to="/imc">Calcula tu IMC sin cuenta</Link>
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function NoEncontrado() {
  return (
    <section className="contenedor flex min-h-screen flex-col items-start justify-center gap-6 pt-24">
      <span className="font-titulo text-[clamp(120px,20vw,260px)] leading-[.8] text-grafito">404</span>
      <h1 className="titulo-xl">Esta página no existe</h1>
      <p className="text-niebla">Puede que el enlace esté mal escrito o que la hayamos movido.</p>
      <BotonLink to="/">Volver al inicio</BotonLink>
    </section>
  );
}
