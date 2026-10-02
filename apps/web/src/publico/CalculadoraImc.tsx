import { BotonLink } from '../ui/Boton';
import { Revelar } from '../ui/Revelar';
import { TarjetaImc } from './TarjetaImc';

const RANGOS = [
  ['Bajo peso', '< 18,5', '#FFB020'],
  ['Normal', '18,5 – 24,9', '#3DDC84'],
  ['Sobrepeso', '25 – 29,9', '#FFB020'],
  ['Obesidad', '≥ 30', '#FF4D1A'],
];

const LIMITES = [
  ['Músculo o grasa', 'No los distingue. Alguien que entrena fuerza puede salir con “sobrepeso” sin tenerlo.'],
  ['Dónde está la grasa', 'No mide la grasa abdominal, que es la que más pesa para la salud. Para eso sirve el perímetro de cintura.'],
  ['No aplica a todos', 'No es igual para menores de 18, embarazadas ni adultos mayores. Ahí se usan otras tablas.'],
  ['No es diagnóstico', 'Solo un profesional de la salud puede decirte cómo estás. El IMC es un punto de partida.'],
];

export function CalculadoraImc() {
  return (
    <>
      <section className="relative overflow-hidden pb-24 pt-40">
        <div aria-hidden className="pointer-events-none absolute -right-[2vw] top-16 font-titulo text-[clamp(160px,26vw,420px)] leading-[.8] text-[#141416]">
          IMC
        </div>
        <div className="contenedor relative grid grid-cols-1 items-start gap-[clamp(32px,5vw,80px)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <div className="flex flex-col gap-5 lg:sticky lg:top-28">
            <div className="kicker">HERRAMIENTA GRATIS</div>
            <h1 className="font-titulo text-[clamp(56px,7vw,112px)] uppercase leading-[.88]">
              Calculadora
              <br />
              <span className="text-voltaje">IMC</span>
            </h1>
            <p className="max-w-[440px] text-[17px] text-niebla">
              Mueve el peso y la estatura. El resultado se actualiza al instante. No guardamos nada hasta que crees tu cuenta.
            </p>
          </div>
          <TarjetaImc />
        </div>
      </section>

      <section className="border-t border-grafito py-[120px]">
        <div className="contenedor grid grid-cols-1 gap-[clamp(32px,5vw,80px)] lg:grid-cols-2">
          <Revelar className="flex flex-col gap-6">
            <div className="kicker">01 · QUÉ ES</div>
            <h2 className="titulo-xl">Una cuenta sencilla.</h2>
            <p className="max-w-[520px] text-[17px] text-niebla">
              El Índice de Masa Corporal relaciona tu peso con tu estatura. Sirve para ubicar, de forma rápida, si tu peso está por
              debajo, dentro o por encima del rango que la Organización Mundial de la Salud usa como referencia para adultos.
            </p>
            <div className="tarjeta flex flex-col gap-4 p-6">
              <div className="etiqueta text-niebla">FÓRMULA</div>
              <div className="cifra text-[clamp(20px,2.4vw,28px)] font-bold">IMC = peso (kg) ÷ estatura (m)²</div>
              <div className="etiqueta text-niebla">EJEMPLO</div>
              <div className="cifra text-lg">
                72 ÷ (1,68 × 1,68) = <span className="text-voltaje">25,5</span>
              </div>
            </div>
          </Revelar>
          <Revelar retraso={120}>
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b-2 border-hueso">
                  <th className="py-3 etiqueta text-niebla">RANGO (OMS, ADULTOS)</th>
                  <th className="py-3 text-right etiqueta text-niebla">IMC</th>
                </tr>
              </thead>
              <tbody>
                {RANGOS.map(([n, r, c]) => (
                  <tr key={n} className="border-b border-grafito">
                    <td className="py-5">
                      <span className="flex items-center gap-3 text-lg font-semibold">
                        <span className="h-4 w-4" style={{ background: c }} />
                        {n}
                      </span>
                    </td>
                    <td className="cifra py-5 text-right text-lg">{r}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Revelar>
        </div>
      </section>

      <section className="border-t border-grafito py-[120px]">
        <div className="contenedor">
          <Revelar>
            <div className="kicker text-senal">02 · SUS LÍMITES</div>
            <h2 className="titulo-xl mt-3">
              Lo que el IMC
              <br />
              no te dice.
            </h2>
          </Revelar>
          <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {LIMITES.map(([t, d], i) => (
              <Revelar key={t} retraso={i * 100}>
                <div className="tarjeta flex h-full flex-col gap-3 p-6">
                  <span className="font-titulo text-5xl leading-none text-grafito">0{i + 1}</span>
                  <h3 className="font-titulo text-2xl uppercase leading-none">{t}</h3>
                  <p className="text-[15px] text-niebla">{d}</p>
                </div>
              </Revelar>
            ))}
          </div>
          <p className="mt-10 max-w-[720px] text-lg">
            Por eso FitIA usa el IMC junto con tu nivel, tus molestias y cómo te va en cada sesión.{' '}
            <span className="text-voltaje">El número cambia; tu rutina también.</span>
          </p>
        </div>
      </section>

      <section className="relative overflow-hidden bg-voltaje py-20 text-asfalto">
        <div className="contenedor flex flex-wrap items-center justify-between gap-8">
          <div>
            <h2 className="font-titulo text-[clamp(44px,6vw,88px)] uppercase leading-[.9]">
              Guarda tu IMC.
              <br />
              Recibe tu rutina.
            </h2>
            <p className="mt-4 max-w-[520px] text-lg">Crea tu cuenta gratis y la IA arma tu primera rutina con este dato.</p>
          </div>
          <BotonLink to="/ingresar#registro" tam="lg" className="!bg-asfalto !text-voltaje !shadow-[0_4px_0_#3A4700]">
            Crear cuenta gratis
          </BotonLink>
        </div>
      </section>
    </>
  );
}
