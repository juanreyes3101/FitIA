import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BotonLink, EnlaceSubrayado, clasesBoton } from '../ui/Boton';
import { Segmentado } from '../ui/Campos';
import { Icono } from '../ui/Iconos';
import { Revelar } from '../ui/Revelar';
import { TarjetaImc } from './TarjetaImc';
import { ListaBeneficios, usePrecioPro } from './Planes';

const PALABRAS = ['FUERZA', 'CONSTANCIA', 'BARRIO', 'SIN EXCUSAS'];
const ESTRELLA = 'M12 2l2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5z';

function Marquesina() {
  const bloque = (k: number) => (
    <div key={k} className="flex items-center gap-8 whitespace-nowrap pr-8 font-titulo text-[clamp(36px,4vw,60px)] leading-none text-asfalto">
      {[...PALABRAS, ...PALABRAS].map((p, i) => (
        <span key={i} className="flex items-center gap-8">
          {p}
          <svg width="28" height="28" viewBox="0 0 24 24" fill="#0B0B0C" aria-hidden>
            <path d={ESTRELLA} />
          </svg>
        </span>
      ))}
    </div>
  );
  return (
    // La cinta es 10 % más ancha que la pantalla y va rotada: el contenedor la recorta solo en X
    // (overflow-x: clip no crea scroll ni corta las esquinas rotadas arriba y abajo)
    <div aria-hidden className="relative z-[2] -mt-14 overflow-x-clip">
      <div className="-mx-[5%] -rotate-3 overflow-hidden border-y-[3px] border-asfalto bg-voltaje py-3.5">
        <div className="flex w-max animate-marquesina">{[0, 1].map(bloque)}</div>
      </div>
    </div>
  );
}

function useContador(objetivo: number, ms = 1600) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now() + 400;
    const paso = (t: number) => {
      const k = Math.max(0, Math.min(1, (t - t0) / ms));
      setN(Math.round(objetivo * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(paso);
    };
    raf = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf);
  }, [objetivo, ms]);
  return n;
}

const PASOS = [
  ['01', 'Cuéntanos de ti', 'Peso, estatura, tu objetivo y si algo te duele. Nada más.', '≈ 2 MINUTOS'],
  ['02', 'La IA arma tu rutina', 'Ejercicios según tu nivel, las máquinas de tu gimnasio y tus molestias.', 'AL INSTANTE'],
  ['03', 'Entrena y mide tu progreso', 'Marca tus series, mira tu avance y la rutina se ajusta contigo.', 'CADA SESIÓN'],
];

const LUMBAR = [
  ['BAJO IMPACTO', 'Puente de glúteo', '3×12 · PESO CORPORAL', 'activa glúteos para que la espalda baja no haga todo el trabajo.'],
  ['BAJO IMPACTO', 'Perro de caza', '3×10 · POR LADO', 'fortalece el core sin comprimir la columna. Estabilidad pura.'],
  ['MOVILIDAD', 'Gato-camello', '2×10 · LENTO', 'mueve la columna vértebra por vértebra. Ideal para calentar.'],
];

const TESTIMONIOS = [
  ['M', 'bg-voltaje', 'Marta, 47', 'KENNEDY · PRINCIPIANTE', 'Nunca había entrado a un gimnasio. La rutina empezó suave y a los dos meses ya hago sentadilla con peso.'],
  ['J', 'bg-hueso', 'Jhon, 33', 'BOSA · ESPALDA', 'Tengo una molestia lumbar vieja. La app me cambió los ejercicios que me dolían. Eso nadie me lo había hecho.'],
  ['D', 'bg-senal', 'Daniela, 22', 'SUBA · FUERZA', 'En mi gimnasio no hay entrenador fijo. Ahora llego sabiendo qué hacer y cuánto peso meter.'],
];

export function Inicio() {
  const capas = useContador(3, 900);
  const [anual, setAnual] = useState(false);
  const pro = usePrecioPro(anual);

  return (
    <>
      {/* HERO */}
      <section className="relative flex min-h-screen items-center overflow-hidden pb-[120px] pt-32">
        <div className="grano pointer-events-none absolute inset-0 opacity-[.08]" />
        <div className="contenedor relative grid grid-cols-1 items-center gap-[clamp(32px,4vw,64px)] lg:grid-cols-2">
          <Revelar className="flex flex-col gap-7">
            <div className="kicker flex items-center gap-2.5">
              <Icono nombre="chispa" tam={16} /> ENTRENAMIENTO CON IA · BOGOTÁ
            </div>
            <h1 className="font-titulo text-[clamp(64px,8.4vw,140px)] font-normal uppercase leading-[.88] tracking-[.005em]">
              Tu rutina.
              <br />
              Tu cuerpo.
              <br />
              <span className="text-voltaje">Tu barrio.</span>
            </h1>
            <p className="max-w-[520px] text-[clamp(18px,1.5vw,21px)] leading-[1.45]">
              Rutinas creadas con inteligencia artificial según tu peso, tu estatura y tus molestias. Gratis.
            </p>
            <div className="flex flex-wrap gap-3">
              <BotonLink to="/ingresar#registro" tam="lg">
                Empieza gratis <Icono nombre="flecha" />
              </BotonLink>
              <a href="#imc" className={clasesBoton('secundario', 'lg')}>
                Calcula tu IMC
              </a>
            </div>
            <div className="flex max-w-[520px] items-center gap-4 border-t border-grafito pt-6">
              <span className="cifra text-[clamp(40px,4vw,56px)] font-bold leading-none tracking-[-.04em] text-voltaje">{capas}</span>
              <span className="text-[15px] leading-tight text-niebla">
                capas de seguridad revisan
                <br />
                cada rutina antes de dártela
              </span>
            </div>
          </Revelar>
          <Revelar retraso={150} className="relative h-[clamp(420px,72vh,760px)]">
            <div
              className="duotono absolute inset-0"
              style={{ clipPath: 'polygon(clamp(40px,6vw,92px) 0,100% 0,100% 100%,0 100%)' }}
            >
              <span aria-hidden className="absolute -bottom-6 right-4 font-titulo text-[clamp(160px,22vw,340px)] leading-none text-asfalto/60">
                24/7
              </span>
            </div>
            <div className="pointer-events-none absolute bottom-8 left-[clamp(0px,2vw,24px)] flex w-[min(300px,80%)] flex-col gap-2.5 rounded border border-grafito bg-asfalto p-4 shadow-flotante">
              <div className="flex items-center justify-between">
                <span className="rounded-sm bg-senal px-2 py-1 text-[11px] font-bold tracking-[.08em] text-asfalto">EN VIVO</span>
                <span className="cifra text-[13px] text-niebla">00:18:42</span>
              </div>
              <div className="font-titulo text-2xl leading-none">SENTADILLA · SERIE 3/4</div>
              <div className="flex gap-1">
                {[1, 1, 1, 0].map((on, i) => (
                  <div key={i} className={`h-1.5 flex-1 ${on ? 'bg-voltaje' : 'bg-grafito'}`} />
                ))}
              </div>
              <div className="text-sm">¡Dale, que ya casi!</div>
            </div>
          </Revelar>
        </div>
      </section>

      <Marquesina />

      {/* CÓMO FUNCIONA */}
      <section id="como" className="relative scroll-mt-10 pb-[120px] pt-40">
        <div className="contenedor">
          <Revelar className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <div className="kicker">CÓMO FUNCIONA</div>
              <h2 className="titulo-xl mt-3">
                Tres pasos.
                <br />
                Cero enredos.
              </h2>
            </div>
            <p className="max-w-[380px] text-[17px] text-niebla">
              De la puerta del gimnasio a tu primera serie, sin saber nada de entrenamiento.
            </p>
          </Revelar>
          <div className="mt-16 grid grid-cols-1 gap-[clamp(24px,3vw,40px)] md:grid-cols-3">
            {PASOS.map(([n, t, d, m], i) => (
              <Revelar key={n} retraso={i * 120} className={`flex flex-col gap-4 border-t-2 pt-6 ${i === 0 ? 'border-voltaje' : 'border-grafito'}`}>
                <div
                  className="font-titulo text-[clamp(120px,12vw,180px)] leading-[.8]"
                  style={i === 0 ? { color: '#D4FF00' } : { color: 'transparent', WebkitTextStroke: '2px #D4FF00' }}
                >
                  {n}
                </div>
                <h3 className="mt-3 font-titulo text-4xl font-normal uppercase leading-none">{t}</h3>
                <p className="max-w-[360px] text-[17px] text-niebla">{d}</p>
                <span className="cifra text-[13px]">{m}</span>
              </Revelar>
            ))}
          </div>
        </div>
      </section>

      {/* IMC (corte diagonal de 7°) */}
      <section id="imc" className="relative overflow-x-clip py-[180px]">
        <div className="absolute inset-x-0 bottom-[90px] top-[90px] -skew-y-[7deg] bg-concreto" />
        <div aria-hidden className="pointer-events-none absolute -right-[1vw] top-[120px] font-titulo text-[clamp(160px,26vw,420px)] leading-[.8] text-[#212125]">
          IMC
        </div>
        <div className="contenedor relative grid grid-cols-1 items-center gap-[clamp(32px,5vw,80px)] lg:grid-cols-2">
          <Revelar className="flex flex-col gap-5">
            <div className="kicker">CALCULADORA IMC</div>
            <h2 className="titulo-xl">
              ¿Cómo vas?
              <br />
              Mídete en
              <br />
              10 segundos.
            </h2>
            <p className="max-w-[440px] text-[17px] text-niebla">
              Es el punto de partida de tu rutina. No es una nota ni un juicio: es un dato para arrancar bien.
            </p>
            <EnlaceSubrayado to="/imc">Qué mide el IMC y qué no →</EnlaceSubrayado>
          </Revelar>
          <Revelar retraso={150}>
            <TarjetaImc />
          </Revelar>
        </div>
      </section>

      {/* ESPALDA */}
      <section className="relative pb-[120px] pt-20">
        <div className="contenedor">
          <Revelar className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <div className="kicker text-senal">MOLESTIA LUMBAR</div>
              <h2 className="titulo-xl mt-3">
                Cuidamos
                <br />
                tu espalda.
              </h2>
            </div>
            <p className="max-w-[440px] text-[17px] text-niebla">
              Si nos cuentas que te duele la zona lumbar, la IA quita lo que la carga y suma ejercicios que la fortalecen.
            </p>
          </Revelar>
          <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-3">
            {LUMBAR.map(([tag, nombre, dosis, porque], i) => (
              <Revelar key={nombre} retraso={i * 120}>
                <article className="tarjeta overflow-hidden transition-[transform,box-shadow] duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#D4FF00]">
                  <div className="duotono relative h-[220px]">
                    <span className="absolute left-4 top-4 rounded-sm bg-asfalto px-2 py-1.5 text-xs font-bold tracking-[.06em] text-exito">{tag}</span>
                    <span className="absolute -bottom-3 right-3 font-titulo text-[88px] leading-none text-asfalto">0{i + 1}</span>
                  </div>
                  <div className="flex flex-col gap-3 p-6">
                    <h3 className="font-titulo text-[28px] font-normal uppercase leading-none">{nombre}</h3>
                    <div className="cifra text-[15px] font-bold">{dosis}</div>
                    <p className="text-[15px] text-niebla">
                      <strong className="text-hueso">Por qué ayuda:</strong> {porque}
                    </p>
                  </div>
                </article>
              </Revelar>
            ))}
          </div>
          <div className="mt-4 flex items-start gap-3.5 rounded border border-grafito px-5 py-4">
            <Icono nombre="alerta" tam={22} className="mt-px flex-none text-advertencia" />
            <p className="text-[15px] text-niebla">
              <strong className="text-hueso">FitIA no reemplaza al fisioterapeuta.</strong> Si el dolor es fuerte, no mejora en
              dos semanas o baja por la pierna, consulta a un profesional de la salud.
            </p>
          </div>
        </div>
      </section>

      {/* PLANES */}
      <section id="planes" className="relative overflow-hidden border-t border-grafito py-[120px]">
        <div aria-hidden className="pointer-events-none absolute -left-[1vw] top-[60px] font-titulo text-[clamp(160px,24vw,380px)] leading-[.8] text-[#141416]">
          $0
        </div>
        <div className="contenedor relative grid grid-cols-1 items-start gap-[clamp(32px,5vw,80px)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <Revelar className="flex flex-col gap-5">
            <div className="kicker">PLANES</div>
            <h2 className="titulo-xl">
              El gratis
              <br />
              es completo.
              <br />
              <span className="text-voltaje">En serio.</span>
            </h2>
            <p className="max-w-[420px] text-[17px] text-niebla">
              Sin periodo de prueba, sin tarjeta, sin letra pequeña. Pro es para quien quiere más rutinas al mes y cero anuncios.
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
            <EnlaceSubrayado to="/planes">Ver la comparación completa →</EnlaceSubrayado>
          </Revelar>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Revelar>
              <div className="relative flex h-full flex-col gap-[22px] overflow-hidden rounded border-2 border-voltaje bg-concreto px-7 pb-7 pt-[52px] shadow-[8px_8px_0_#D4FF00]">
                <div className="cinta absolute inset-x-0 top-0 h-7" />
                <div className="absolute right-4 top-10 rotate-[7deg] border-2 border-voltaje px-2.5 py-1.5 font-titulo text-xl leading-none text-voltaje">
                  COMPLETO
                </div>
                <div>
                  <div className="font-titulo text-4xl leading-none">FITIA FREE</div>
                  <div className="mt-1.5 text-[15px] text-niebla">Sin excusas, sin costo.</div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="cifra text-[56px] font-bold leading-none tracking-[-.04em] text-voltaje">$0</span>
                  <span className="text-[15px] text-niebla">para siempre</span>
                </div>
                <ListaBeneficios plan="free" />
                <BotonLink to="/ingresar#registro">Empieza gratis</BotonLink>
              </div>
            </Revelar>
            <Revelar retraso={120}>
              <div className="flex h-full flex-col gap-[22px] rounded border border-grafito bg-concreto px-7 pb-7 pt-[52px]">
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
            </Revelar>
          </div>
        </div>
      </section>

      {/* TESTIMONIOS */}
      <section className="relative border-t border-grafito py-[120px]">
        <div className="contenedor">
          <Revelar className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <div className="kicker">TESTIMONIOS</div>
              <h2 className="titulo-xl mt-3">
                Así suena
                <br />
                el barrio.
              </h2>
            </div>
            <span className="inline-flex items-center gap-2 rounded-sm border border-advertencia px-2.5 py-2 etiqueta text-advertencia">
              EJEMPLOS ILUSTRATIVOS · NO SON USUARIOS REALES
            </span>
          </Revelar>
          <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-3">
            {TESTIMONIOS.map(([ini, bg, nombre, lugar, texto], i) => (
              <Revelar key={nombre} retraso={i * 120}>
                <figure className="tarjeta m-0 flex h-full flex-col gap-5 p-7">
                  <div className="flex items-start justify-between">
                    <span className="h-12 font-titulo text-[96px] leading-[.6] text-voltaje">“</span>
                    <span className="rounded-sm bg-advertencia/15 px-2 py-1 text-[11px] font-bold tracking-[.08em] text-advertencia">EJEMPLO</span>
                  </div>
                  <blockquote className="m-0 flex-1 text-[19px] leading-[1.45]">{texto}</blockquote>
                  <figcaption className="flex items-center gap-3">
                    <span className={`flex h-12 w-12 flex-none items-center justify-center rounded-sm font-titulo text-[22px] text-asfalto ${bg}`}>{ini}</span>
                    <span>
                      <strong className="block">{nombre}</strong>
                      <span className="cifra text-[13px] text-niebla">{lugar}</span>
                    </span>
                  </figcaption>
                </figure>
              </Revelar>
            ))}
          </div>
        </div>
      </section>

      {/* WEB Y CELULAR */}
      <section id="app" className="relative overflow-hidden border-t border-grafito pb-40 pt-[120px]">
        <div className="contenedor relative grid grid-cols-1 items-center gap-[clamp(40px,5vw,80px)] lg:grid-cols-2">
          <Revelar className="flex flex-col gap-6">
            <div className="kicker">DISPONIBLE EN WEB Y CELULAR</div>
            <h2 className="titulo-xl">
              Entrena
              <br />
              donde estés.
            </h2>
            <p className="max-w-[440px] text-[17px] text-niebla">
              Arma tu rutina en el computador y llévala en el celular al gimnasio. Tu progreso va contigo.
            </p>
            <div className="flex flex-col gap-3.5">
              {(
                [
                  ['rayo', 'Liviana: funciona con pocos datos'],
                  ['reloj', 'Cronómetro de descanso en cada serie'],
                  ['progreso', 'Tu avance, semana a semana'],
                ] as const
              ).map(([ic, t]) => (
                <div key={t} className="flex items-center gap-3">
                  <span className="flex h-11 w-11 flex-none items-center justify-center rounded border border-grafito text-voltaje">
                    <Icono nombre={ic} />
                  </span>
                  {t}
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              <BotonLink to="/ingresar#registro">Empieza en la web</BotonLink>
            </div>
          </Revelar>
          <Revelar retraso={150} className="relative flex min-h-[640px] items-center justify-center">
            <div className="absolute -left-[10%] -right-[30%] top-[22%] h-[56%] -skew-y-[7deg] bg-voltaje" />
            <div className="cinta absolute -left-[10%] -right-[30%] top-[calc(22%-30px)] h-5 -skew-y-[7deg]" />
            <div className="relative flex h-[620px] w-[300px] flex-col overflow-hidden rounded-[44px] border-[10px] border-concreto bg-asfalto shadow-[0_0_0_1px_#2A2A2E,0_40px_80px_-20px_rgba(0,0,0,.9)]">
              <div className="flex items-center justify-between px-[22px] pt-3.5 font-metrica text-xs font-bold">
                <span>9:41</span>
                <span className="h-[22px] w-20 rounded-xl bg-black" />
                <span>5G</span>
              </div>
              <div className="flex flex-1 flex-col gap-3.5 px-[18px] pt-5">
                <div className="text-[11px] font-bold tracking-[.08em] text-niebla">HOLA, LAURA</div>
                <div className="font-titulo text-[34px] leading-[.95]">
                  RUTINA DE HOY:
                  <br />
                  <span className="text-voltaje">PIERNA</span>
                </div>
                <div className="tarjeta flex flex-col gap-2.5 p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="font-titulo text-lg">PUENTE DE GLÚTEO</span>
                    <span className="font-titulo text-[28px] leading-none text-grafito">01</span>
                  </div>
                  <div className="cifra text-[13px] font-bold">3×15 · 45 s</div>
                  <div className="flex gap-[3px]">
                    {[1, 1, 0].map((on, i) => (
                      <div key={i} className={`h-[5px] flex-1 ${on ? 'bg-voltaje' : 'bg-grafito'}`} />
                    ))}
                  </div>
                  <div className="flex min-h-10 items-center justify-center rounded bg-voltaje text-sm font-semibold text-asfalto shadow-[0_3px_0_#7E9900]">
                    Serie lista
                  </div>
                </div>
              </div>
            </div>
          </Revelar>
        </div>
      </section>

      {/* CIERRE */}
      <section className="relative overflow-hidden bg-voltaje py-24 text-asfalto">
        <div className="contenedor flex flex-col items-start gap-8">
          <h2 className="font-titulo text-[clamp(56px,9vw,150px)] uppercase leading-[.88]">
            Arranca hoy.
            <br />
            Gratis. Sin tarjeta.
            <br />
            Sin excusas.
          </h2>
          <Link
            to="/ingresar#registro"
            className="inline-flex min-h-[56px] items-center gap-2.5 rounded bg-asfalto px-7 text-[17px] font-semibold text-voltaje no-underline shadow-[0_4px_0_#3A4700] hover:text-hueso active:translate-y-0.5"
          >
            Empieza gratis <Icono nombre="flecha" />
          </Link>
        </div>
      </section>
    </>
  );
}
