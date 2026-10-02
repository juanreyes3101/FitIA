import { BotonLink } from '../ui/Boton';
import { Icono, type NombreIcono } from '../ui/Iconos';
import { Revelar } from '../ui/Revelar';

const PROBLEMAS = [
  ['Sedentarismo', 'Sin un plan claro, la constancia se pierde en pocas semanas.'],
  ['Rutinas copiadas', 'Lo que le sirve al vecino no siempre le sirve a tu cuerpo ni a tus molestias.'],
  ['Entrenador caro', 'Un entrenador personal está fuera del bolsillo de la mayoría.'],
];

const EQUIPO = ['Juan Reyes', 'Juan Delgado', 'Vanesa Vargas', 'Santiago Castañeda'];

const TECNOLOGIA: [NombreIcono, string, string][] = [
  ['ia', 'IA', 'Genera rutinas con tu peso, estatura, nivel y molestias. Un validador y la base de datos revisan que sean seguras.'],
  ['inicio', 'Web', 'Este sitio y la versión web de la app: registro, calculadora y rutinas desde cualquier navegador.'],
  ['entreno', 'App móvil', 'Tu rutina en el bolsillo: marca series, cronómetro de descanso y tu progreso.'],
  ['progreso', 'Monitoreo', 'App de escritorio para el gimnasio: usuarios, rutinas, reportes y la salud del sistema en vivo.'],
];

const iniciales = (n: string) => n.split(' ').map((p) => p[0]).join('');

export function SobreNosotros() {
  return (
    <>
      <section className="relative overflow-hidden pb-24 pt-40">
        <div className="grano pointer-events-none absolute inset-0 opacity-[.08]" />
        <div aria-hidden className="pointer-events-none absolute -right-[2vw] top-16 font-titulo text-[clamp(160px,28vw,460px)] leading-[.8] text-[#141416]">
          BOG
        </div>
        <div className="contenedor relative flex flex-col gap-6">
          <div className="kicker">SOBRE NOSOTROS · PROYECTO INTEGRADOR CUN 2026</div>
          <h1 className="font-titulo text-[clamp(56px,8vw,140px)] uppercase leading-[.88]">
            Hecho en Bogotá.
            <br />
            <span className="text-voltaje">Para el barrio.</span>
          </h1>
          <p className="max-w-[620px] text-[clamp(17px,1.4vw,21px)] leading-[1.45]">
            Somos estudiantes de Ingeniería de Sistemas de la CUN. FitIA nació de algo que vemos todos los días: gimnasios llenos de
            ganas y vacíos de acompañamiento.
          </p>
        </div>
      </section>

      <section className="border-t border-grafito py-[120px]">
        <div className="contenedor grid grid-cols-1 gap-[clamp(32px,5vw,80px)] lg:grid-cols-2">
          <Revelar className="flex flex-col gap-6">
            <div className="kicker text-senal">EL PROBLEMA</div>
            <h2 className="titulo-xl">
              Hay gimnasio.
              <br />
              Falta quién te guíe.
            </h2>
            <p className="max-w-[520px] text-[17px] text-niebla">
              En los gimnasios de barrio de estratos 1, 2 y 3 hay máquinas, buena música y gente con ganas. Lo que casi nunca hay es
              un profesional que arme rutinas a la medida y corrija. La gente copia lo que ve, se lesiona o se aburre, y vuelve al
              sedentarismo.
            </p>
          </Revelar>
          <div className="flex flex-col">
            {PROBLEMAS.map(([t, d], i) => (
              <Revelar key={t} retraso={i * 120} className="flex gap-6 border-b border-grafito py-6">
                <span className="font-titulo text-5xl leading-none text-voltaje">0{i + 1}</span>
                <div>
                  <h3 className="font-titulo text-3xl uppercase leading-none">{t}</h3>
                  <p className="mt-2 text-niebla">{d}</p>
                </div>
              </Revelar>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden py-[140px]">
        <div className="absolute inset-x-0 bottom-[60px] top-[60px] -skew-y-[7deg] bg-voltaje" />
        <div className="contenedor relative text-asfalto">
          <div className="kicker text-asfalto">NUESTRA MISIÓN</div>
          <p className="mt-6 max-w-[1100px] font-titulo text-[clamp(40px,5.6vw,88px)] uppercase leading-[.92]">
            Que cualquiera, en cualquier gimnasio del barrio, entrene con una rutina hecha a su medida. Gratis.
          </p>
        </div>
      </section>

      <section id="equipo" className="scroll-mt-24 py-[120px]">
        <div className="contenedor">
          <Revelar className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <div className="kicker">EL EQUIPO</div>
              <h2 className="titulo-xl mt-3">Cuatro del parche</h2>
            </div>
            <p className="max-w-[420px] text-niebla">
              Estudiantes de Ingeniería de Sistemas · Corporación Unificada Nacional de Educación Superior (CUN).
            </p>
          </Revelar>
          <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {EQUIPO.map((n, i) => (
              <Revelar key={n} retraso={i * 100}>
                <div className="tarjeta overflow-hidden">
                  <div className="duotono relative flex h-[220px] items-center justify-center">
                    <span className="font-titulo text-[96px] leading-none text-asfalto/80">{iniciales(n)}</span>
                    <span className="absolute left-4 top-4 cifra text-[13px] text-voltaje">0{i + 1}</span>
                  </div>
                  <div className="p-5">
                    <h3 className="font-titulo text-[28px] uppercase leading-none">{n}</h3>
                    <div className="mt-2 cifra text-[13px] text-niebla">ING. DE SISTEMAS · CUN</div>
                  </div>
                </div>
              </Revelar>
            ))}
          </div>
        </div>
      </section>

      <section id="tecnologia" className="scroll-mt-24 border-t border-grafito py-[120px]">
        <div className="contenedor">
          <Revelar>
            <div className="kicker">LA TECNOLOGÍA</div>
            <h2 className="titulo-xl mt-3">
              Cuatro piezas,
              <br />
              un sistema.
            </h2>
          </Revelar>
          <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {TECNOLOGIA.map(([ic, t, d], i) => (
              <Revelar key={t} retraso={i * 100}>
                <div className="tarjeta flex h-full flex-col gap-4 p-6">
                  <span className="flex h-12 w-12 items-center justify-center rounded border border-grafito text-voltaje">
                    <Icono nombre={ic} tam={24} />
                  </span>
                  <h3 className="font-titulo text-3xl uppercase leading-none">{t}</h3>
                  <p className="text-[15px] text-niebla">{d}</p>
                </div>
              </Revelar>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-grafito py-24">
        <div className="contenedor flex flex-wrap items-center justify-between gap-8">
          <h2 className="titulo-xl">
            ¿Tienes un gimnasio
            <br />
            de barrio?
          </h2>
          <BotonLink to="/ingresar#registro" tam="lg">
            Prueba FitIA gratis
          </BotonLink>
        </div>
      </section>
    </>
  );
}
