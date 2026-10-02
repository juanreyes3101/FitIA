import { useState } from 'react';
import { formatoCop, type Plan } from '@fitia/shared';
import { api } from '../api';
import { useDatos } from '../hooks/useDatos';
import { BotonLink } from '../ui/Boton';
import { Segmentado } from '../ui/Campos';
import { Icono } from '../ui/Iconos';
import { Revelar } from '../ui/Revelar';

// Respaldo si la API no responde: mismos valores de database/seed.sql
const RESPALDO: Pick<Plan, 'codigo' | 'precio_cop' | 'rutinas_ia_mes'>[] = [
  { codigo: 'GRATIS', precio_cop: 0, rutinas_ia_mes: 2 },
  { codigo: 'PREMIUM_MES', precio_cop: 19900, rutinas_ia_mes: 10 },
  { codigo: 'PREMIUM_ANUAL', precio_cop: 199000, rutinas_ia_mes: 10 },
];

let cachePlanes: Promise<Plan[]> | null = null;
export const obtenerPlanes = () => (cachePlanes ??= api.planes().catch((e) => ((cachePlanes = null), Promise.reject(e))));

export function usePlanes() {
  const { datos } = useDatos(obtenerPlanes);
  const lista = (datos ?? RESPALDO) as Plan[];
  const por = (c: string) => lista.find((p) => p.codigo === c);
  return { free: por('GRATIS'), mes: por('PREMIUM_MES'), anual: por('PREMIUM_ANUAL'), cargado: !!datos };
}

/** Precio de Pro según el periodo, con la nota de ahorro del diseño. */
export function usePrecioPro(anual: boolean) {
  const { mes, anual: an } = usePlanes();
  const pm = mes?.precio_cop ?? 19900;
  const pa = an?.precio_cop ?? 199000;
  return anual
    ? {
        precio: formatoCop(pa),
        periodo: '/año',
        nota: `Equivale a ${formatoCop(Math.round(pa / 12))} al mes · ahorras ${formatoCop(pm * 12 - pa)}`,
        plan: an,
      }
    : { precio: formatoCop(pm), periodo: '/mes', nota: 'Pago simulado: no se cobra nada', plan: mes };
}

export function ListaBeneficios({ plan }: { plan: 'free' | 'pro' }) {
  const { free, mes } = usePlanes();
  const items: [boolean, React.ReactNode][] =
    plan === 'free'
      ? [
          [true, <><strong className="cifra">{free?.rutinas_ia_mes ?? 2}</strong> rutinas IA al mes</>],
          [true, 'Ajuste por molestias (espalda, rodilla)'],
          [true, 'IMC, peso y progreso'],
          [true, 'Modo entreno con cronómetro'],
          [false, 'Con publicidad'],
        ]
      : [
          [true, 'Todo lo de Free'],
          [true, <><strong className="cifra">{mes?.rutinas_ia_mes ?? 10}</strong> rutinas IA al mes</>],
          [true, 'Sin publicidad'],
        ];
  return (
    <div className="flex flex-1 flex-col gap-3 text-base">
      {items.map(([ok, t], i) => (
        <div key={i} className={`flex gap-2.5 ${ok ? '' : 'text-niebla'}`}>
          <Icono nombre={ok ? 'check' : 'anuncio'} className={`mt-0.5 flex-none ${ok ? 'text-voltaje' : 'text-niebla'}`} />
          <span>{t}</span>
        </div>
      ))}
    </div>
  );
}

const SI = 'si';
const NO = 'no';

function Celda({ v }: { v: string }) {
  if (v === SI) return <Icono nombre="check" className="text-voltaje" aria-label="Sí" />;
  if (v === NO) return <span className="text-humo" aria-label="No">—</span>;
  return <span className="cifra text-[15px]">{v}</span>;
}

const PREGUNTAS = [
  ['¿El plan gratis de verdad es completo?', 'Sí. Tienes rutinas IA cada mes, ajustes por molestias, IMC y registro de progreso. No vence y no te pedimos tarjeta. A cambio, ves algo de publicidad.'],
  ['¿Qué pasa si se me acaban las rutinas del mes?', 'Sigues entrenando con la rutina que ya tienes y registrando tu progreso. El mes siguiente se recargan. Si necesitas más, puedes pasarte a Pro.'],
  ['¿La IA puede darme un ejercicio que me lastime?', 'Cada rutina pasa por tres filtros: la IA solo ve ejercicios seguros para ti, un validador revisa sus reglas y la base de datos bloquea cualquier ejercicio contraindicado.'],
  ['¿Cómo pago Pro?', 'Con Nequi, PSE o tarjeta débito o crédito. En esta versión los pagos son simulados: no se hace ningún cobro real.'],
];

export function Planes() {
  const [anual, setAnual] = useState(false);
  const pro = usePrecioPro(anual);
  const { free, mes } = usePlanes();

  const filas: ({ g: string } | { l: string; free: string; pro: string })[] = [
    { g: 'Rutinas' },
    { l: 'Rutinas IA al mes', free: String(free?.rutinas_ia_mes ?? 2), pro: String(mes?.rutinas_ia_mes ?? 10) },
    { l: 'Ajuste por molestias (espalda, rodilla, presión)', free: SI, pro: SI },
    { l: 'Validación de seguridad en 3 capas', free: SI, pro: SI },
    { g: 'Seguimiento' },
    { l: 'Calculadora y registro de IMC', free: SI, pro: SI },
    { l: 'Registro de series, esfuerzo y dolor', free: SI, pro: SI },
    { l: 'Gráficas de progreso', free: SI, pro: SI },
    { l: 'Descargar tus datos', free: SI, pro: SI },
    { g: 'Experiencia' },
    { l: 'Web y app para celular', free: SI, pro: SI },
    { l: 'Publicidad', free: 'Sí', pro: 'No' },
    { g: 'Pago' },
    { l: 'Medios de pago (simulados)', free: NO, pro: 'Nequi · PSE · tarjeta' },
  ];

  return (
    <>
      <section className="relative overflow-hidden pb-20 pt-40">
        <div aria-hidden className="pointer-events-none absolute -right-[2vw] top-20 font-titulo text-[clamp(160px,28vw,460px)] leading-[.8] text-[#141416]">
          $0
        </div>
        <div className="contenedor relative flex flex-col gap-6">
          <div className="kicker">PLANES</div>
          <h1 className="font-titulo text-[clamp(56px,7vw,120px)] uppercase leading-[.88]">
            Gratis completo.
            <br />
            <span className="text-voltaje">Pro si quieres más.</span>
          </h1>
          <p className="max-w-[560px] text-[clamp(17px,1.4vw,20px)] text-niebla">
            Con Free entrenas de verdad: rutinas IA, ajustes por molestias y seguimiento. Pro suma más rutinas al mes y quita los anuncios.
          </p>
          <Segmentado
            etiqueta="Periodo de pago"
            valor={anual ? 'a' : 'm'}
            onCambio={(v) => setAnual(v === 'a')}
            opciones={[
              { valor: 'm', etiqueta: 'Mensual' },
              { valor: 'a', etiqueta: 'Anual · −17%' },
            ]}
          />
          <div className="mt-6 grid grid-cols-1 max-w-[980px] gap-4 md:grid-cols-2">
            <div className="relative flex flex-col gap-[22px] overflow-hidden rounded border-2 border-voltaje bg-concreto px-7 pb-7 pt-[52px] shadow-[8px_8px_0_#D4FF00]">
              <div className="cinta absolute inset-x-0 top-0 h-7" />
              <div className="absolute right-4 top-10 rotate-[7deg] border-2 border-voltaje px-2.5 py-1.5 font-titulo text-xl leading-none text-voltaje">COMPLETO</div>
              <div>
                <div className="font-titulo text-4xl leading-none">FITIA FREE</div>
                <div className="mt-1.5 text-[15px] text-niebla">Sin excusas, sin costo.</div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="cifra text-[56px] font-bold leading-none tracking-[-.04em] text-voltaje">$0</span>
                <span className="text-[15px] text-niebla">para siempre · con publicidad</span>
              </div>
              <ListaBeneficios plan="free" />
              <BotonLink to="/ingresar#registro">Empieza gratis</BotonLink>
            </div>
            <div className="flex flex-col gap-[22px] rounded border border-grafito bg-concreto px-7 pb-7 pt-[52px]">
              <div>
                <div className="font-titulo text-4xl leading-none">FITIA PRO</div>
                <div className="mt-1.5 text-[15px] text-niebla">Más rutinas, cero anuncios.</div>
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-baseline gap-2">
                  <span className="cifra text-[56px] font-bold leading-none tracking-[-.04em]">{pro.precio}</span>
                  <span className="text-[15px] text-niebla">{pro.periodo}</span>
                </div>
                <span className="min-h-[21px] text-sm text-voltaje">{pro.nota}</span>
              </div>
              <ListaBeneficios plan="pro" />
              <BotonLink to="/ingresar#registro" variante="secundario">
                Pasarme a Pro
              </BotonLink>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-grafito py-[120px]">
        <div className="contenedor">
          <Revelar>
            <h2 className="titulo-xl">Cara a cara</h2>
          </Revelar>
          <div className="mt-12 overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-left">
              <thead>
                <tr className="border-b-2 border-hueso">
                  <th className="py-4 pr-4 etiqueta text-niebla">CARACTERÍSTICA</th>
                  <th className="w-[22%] py-4 pr-4">
                    <span className="font-titulo text-2xl">FREE</span> <span className="cifra text-voltaje">$0</span>
                  </th>
                  <th className="w-[26%] py-4">
                    <span className="font-titulo text-2xl">PRO</span> <span className="cifra text-niebla">{pro.precio}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f, i) =>
                  'g' in f ? (
                    <tr key={i}>
                      <td colSpan={3} className="kicker pb-2 pt-8">
                        {f.g.toUpperCase()}
                      </td>
                    </tr>
                  ) : (
                    <tr key={i} className="border-b border-grafito">
                      <td className="py-4 pr-4">{f.l}</td>
                      <td className="py-4 pr-4">
                        <Celda v={f.free} />
                      </td>
                      <td className="py-4">
                        <Celda v={f.pro} />
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="border-t border-grafito py-[120px]">
        <div className="contenedor grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
          <div>
            <div className="kicker">PREGUNTAS</div>
            <h2 className="titulo-xl mt-3">
              Sin letra
              <br />
              pequeña.
            </h2>
          </div>
          <div className="flex flex-col">
            {PREGUNTAS.map(([q, a]) => (
              <details key={q} className="group border-b border-grafito">
                <summary className="flex min-h-[64px] cursor-pointer list-none items-center justify-between gap-4 py-4 text-lg font-semibold">
                  {q}
                  <span className="cifra text-2xl text-voltaje transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="pb-6 text-niebla">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
