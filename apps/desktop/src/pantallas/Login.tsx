import { useState, type FormEvent } from 'react';
import { ApiError } from '@fitia/shared';
import { cambiarApiUrl, obtenerApiUrl, probarApi } from '../api';
import { useSesion } from '../sesion/SesionContext';
import { mensajeError } from '../ui/Estados';
import { useToast } from '../ui/Toasts';

const RUIDO =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

export function Login() {
  const { login } = useSesion();
  const avisar = useToast();
  const [email, setEmail] = useState('admin@fitia.co');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [intento, setIntento] = useState(0);
  const [verServidor, setVerServidor] = useState(false);
  const [url, setUrl] = useState(obtenerApiUrl());
  const [prueba, setPrueba] = useState<{ ok: boolean; mensaje: string } | null>(null);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (ocupado) return;
    if (!email.trim() || !password) {
      setError('Escribe tu correo y tu contraseña.');
      setIntento((n) => n + 1);
      return;
    }
    setOcupado(true);
    setError(null);
    try {
      const u = await login(email.trim(), password);
      avisar('ok', `Bienvenido, ${u.nombres}`, u.rol === 'ADMIN' ? 'Sesión de administrador iniciada' : 'Sesión de entrenador iniciada');
    } catch (err) {
      setError(err instanceof ApiError && err.codigo === 'CREDENCIALES_INVALIDAS'
        ? 'Correo o contraseña incorrectos.'
        : mensajeError(err));
      setIntento((n) => n + 1);
    } finally {
      setOcupado(false);
    }
  }

  async function guardarServidor() {
    const resultado = await probarApi(url);
    setPrueba(resultado);
    if (!resultado.ok) return;
    try {
      setUrl(await cambiarApiUrl(url));
      avisar('ok', 'Servidor guardado', url);
    } catch (err) {
      setPrueba({ ok: false, mensaje: mensajeError(err) });
    }
  }

  const borde = error ? 'border-error' : 'border-grafito';
  return (
    <div className="grid h-full grid-cols-[minmax(0,1.1fr)_minmax(420px,1fr)] bg-asfalto">
      <div className="relative flex flex-col justify-end overflow-hidden bg-carbon p-12">
        <div aria-hidden="true" className="absolute inset-0 opacity-[.08]" style={{ backgroundImage: RUIDO }} />
        <div aria-hidden="true" className="absolute right-[-20px] top-5 font-titulo text-[360px] leading-[.8] text-transparent [-webkit-text-stroke:2px_#232327]">24/7</div>
        <div aria-hidden="true" className="absolute left-[-10%] right-[-10%] top-[52%] h-5 -rotate-[7deg] bg-[repeating-linear-gradient(-45deg,#D4FF00_0_14px,#0B0B0C_14px_28px)]" />
        <div className="relative flex flex-col gap-[14px]">
          <span className="font-metrica text-[12px] font-bold tracking-[.08em] text-voltaje">ADMINISTRACIÓN Y MONITOREO</span>
          <h1 className="font-titulo text-[88px] font-normal uppercase leading-[.86]">
            FitIA<br />
            <span className="text-voltaje">Control</span>
          </h1>
          <p className="max-w-[420px] text-[15px] text-niebla">Usuarios, entrenadores, contenido y la salud de la plataforma en un solo lugar.</p>
        </div>
      </div>

      <div className="flex items-center justify-center overflow-y-auto p-10">
        <div className="flex w-full max-w-[380px] flex-col gap-4">
          <form onSubmit={enviar} noValidate key={intento} className={`flex flex-col gap-4 ${intento ? 'animate-temblor' : ''}`}>
            <h2 className="font-titulo text-[36px] font-normal uppercase leading-none">Ingreso</h2>
            <p className="-mt-2 text-[14px] text-niebla">Solo administradores y entrenadores.</p>
            <label className="flex flex-col gap-[6px]">
              <span className="text-[13px] font-semibold">Correo institucional</span>
              <input value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" type="email"
                className={`min-h-[44px] rounded border-2 ${borde} bg-asfalto px-3 text-hueso outline-none focus:border-voltaje`} />
            </label>
            <label className="flex flex-col gap-[6px]">
              <span className="text-[13px] font-semibold">Contraseña</span>
              <input value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" type="password"
                className={`min-h-[44px] rounded border-2 ${borde} bg-asfalto px-3 text-hueso outline-none focus:border-voltaje`} />
            </label>
            {error && (
              <div role="alert" className="rounded border border-error bg-error/[.08] px-3 py-[10px] text-[13px] text-error">{error}</div>
            )}
            <button type="submit" disabled={ocupado}
              className="flex min-h-[48px] items-center justify-center gap-[10px] rounded bg-voltaje text-[15px] font-bold text-asfalto shadow-golpe hover:bg-voltaje-hover active:translate-y-[2px] active:shadow-golpe-2 disabled:opacity-70">
              {ocupado ? 'Verificando…' : 'Ingresar'}
            </button>
          </form>
          <div className="rounded border border-dashed border-grafito px-3 py-[10px] font-metrica text-[12px] text-niebla">
            DEMO · admin@fitia.co · Admin2026*
          </div>

          <div className="border-t border-grafito pt-3">
            <button type="button" onClick={() => setVerServidor((v) => !v)} aria-expanded={verServidor}
              className="flex w-full items-center justify-between text-[13px] font-semibold text-niebla hover:text-hueso">
              <span>Servidor: <span className="font-metrica text-[12px] text-hueso">{obtenerApiUrl()}</span></span>
              <span aria-hidden="true">{verServidor ? '−' : '+'}</span>
            </button>
            {verServidor && (
              <div className="mt-3 flex flex-col gap-2">
                <input value={url} onChange={(e) => { setUrl(e.target.value); setPrueba(null); }} aria-label="URL de la API"
                  className="campo font-metrica text-[12px]" spellCheck={false} />
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => void guardarServidor()}
                    className="min-h-[32px] rounded bg-hueso px-3 text-[13px] font-bold text-asfalto">Probar y guardar</button>
                  {prueba && <span className={`text-[12px] ${prueba.ok ? 'text-exito' : 'text-error'}`}>{prueba.mensaje}</span>}
                </div>
                <p className="text-[12px] text-humo">Por defecto http://localhost:5000/api/v1. En otra PC de la red: http://&lt;IP&gt;:5000/api/v1.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
