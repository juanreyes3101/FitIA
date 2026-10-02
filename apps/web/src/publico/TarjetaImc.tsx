import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { calcularImc, clasificarImc, formatoNumero, type ImcResultado } from '@fitia/shared';
import { api } from '../api';
import { Boton } from '../ui/Boton';
import { CampoNumero } from '../ui/Campos';
import { Icono } from '../ui/Iconos';
import { COLOR_IMC, MedidorImc, MENSAJE_IMC, SEGMENTOS } from '../ui/MedidorImc';

const num = (v: string) => parseFloat(v.replace(',', '.'));
export const RANGO_PESO = [30, 250] as const;
export const RANGO_ESTATURA = [120, 220] as const;

/** Número que sube animado (conteo 500 ms, curva de salida). */
function useConteo(objetivo: number | null) {
  const [valor, setValor] = useState(0);
  const desde = useRef(0);
  useEffect(() => {
    if (objetivo == null) return;
    const inicio = performance.now();
    const de = desde.current;
    let raf = 0;
    const paso = (t: number) => {
      const k = Math.min(1, (t - inicio) / 500);
      const v = de + (objetivo - de) * (1 - Math.pow(1 - k, 3));
      desde.current = v;
      setValor(v);
      if (k < 1) raf = requestAnimationFrame(paso);
    };
    raf = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf);
  }, [objetivo]);
  return valor;
}

/** Calculadora IMC del diseño (comun/FitiaIMC): cálculo local al instante + confirmación con GET /imc. */
export function TarjetaImc({ cta = true }: { cta?: boolean }) {
  const [peso, setPeso] = useState('72');
  const [est, setEst] = useState('168');
  const [api_, setApi] = useState<ImcResultado | null>(null);
  const navigate = useNavigate();

  const p = num(peso);
  const e = num(est);
  const okP = p >= RANGO_PESO[0] && p <= RANGO_PESO[1];
  const okE = e >= RANGO_ESTATURA[0] && e <= RANGO_ESTATURA[1];
  const imc = okP && okE ? calcularImc(p, e) : null;
  const clase = imc != null ? clasificarImc(imc) : null;
  const mostrado = useConteo(imc);

  // Confirmación con la API (pública) cuando el usuario deja de mover los controles
  useEffect(() => {
    setApi(null);
    if (imc == null) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      api.imc(p, e, ctrl.signal).then(setApi).catch(() => undefined);
    }, 400);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [imc, p, e]);

  const etiqueta = clase ? SEGMENTOS.find((s) => s.clase === clase)!.etiqueta.toUpperCase() : 'REVISA LOS DATOS';

  return (
    <div className="relative flex flex-col gap-7 rounded border border-grafito bg-asfalto p-5 shadow-[8px_8px_0_#2A2A2E] sm:p-9">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <CampoNumero
            etiqueta="Peso"
            valor={peso}
            onCambio={setPeso}
            unidad="kg"
            error={!okP && (peso ? `Escribe un peso entre ${RANGO_PESO[0]} y ${RANGO_PESO[1]} kg.` : 'Escribe tu peso.')}
            ayuda="Con ropa ligera, en la mañana."
          />
          <input
            type="range"
            min={RANGO_PESO[0]}
            max={200}
            value={okP ? p : 72}
            onChange={(ev) => setPeso(ev.target.value)}
            aria-label="Peso en kilogramos"
            className="h-11 w-full"
          />
        </div>
        <div className="flex flex-col gap-2">
          <CampoNumero
            etiqueta="Estatura"
            valor={est}
            onCambio={setEst}
            unidad="cm"
            inputMode="numeric"
            error={!okE && (est ? `Escribe una estatura entre ${RANGO_ESTATURA[0]} y ${RANGO_ESTATURA[1]} cm.` : 'Escribe tu estatura.')}
            ayuda="Sin zapatos, espalda recta."
          />
          <input
            type="range"
            min={RANGO_ESTATURA[0]}
            max={215}
            value={okE ? e : 168}
            onChange={(ev) => setEst(ev.target.value)}
            aria-label="Estatura en centímetros"
            className="h-11 w-full"
          />
        </div>
      </div>

      <div className="h-px bg-grafito" />

      <div aria-live="polite" className="flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="etiqueta text-niebla">TU IMC</div>
            <div className="cifra text-[clamp(64px,8vw,96px)] font-bold leading-none tracking-[-.04em] text-voltaje">
              {imc == null ? '--,-' : formatoNumero(mostrado, 1)}
            </div>
          </div>
          <span
            className="rounded-sm px-3 py-2 text-[13px] font-bold tracking-[.08em] text-asfalto transition-colors"
            style={{ background: clase ? COLOR_IMC[clase] : '#9A9AA0' }}
          >
            {etiqueta}
          </span>
        </div>
        <MedidorImc imc={imc} />
        <p className="text-[17px]">
          {clase
            ? (api_?.mensaje ?? MENSAJE_IMC[clase])
            : 'Completa peso y estatura para ver tu resultado.'}{' '}
          <span className="text-niebla">El IMC es una referencia, no un diagnóstico.</span>
        </p>
        {cta && (
          <Boton
            className="self-start"
            disabled={imc == null}
            onClick={() => navigate('/ingresar#registro', { state: { peso: p, estatura: e } })}
          >
            Arma mi rutina con este dato <Icono nombre="flecha" />
          </Boton>
        )}
      </div>
    </div>
  );
}
