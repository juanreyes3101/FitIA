import { clasificarImc, type ClasificacionImc } from '@fitia/shared';

// Barra de 4 segmentos OMS del diseño (FitiaIMC.dc.html): el ancho de cada tramo es proporcional al rango.
export const SEGMENTOS: { clase: ClasificacionImc; etiqueta: string; rango: string; flex: number; color: string; desde: number; hasta: number }[] = [
  { clase: 'BAJO_PESO', etiqueta: 'Bajo peso', rango: '<18,5', flex: 3.5, color: '#FFB020', desde: 15, hasta: 18.5 },
  { clase: 'NORMAL', etiqueta: 'Normal', rango: '18,5–24,9', flex: 6.5, color: '#3DDC84', desde: 18.5, hasta: 25 },
  { clase: 'SOBREPESO', etiqueta: 'Sobrepeso', rango: '25–29,9', flex: 5, color: '#FFB020', desde: 25, hasta: 30 },
  { clase: 'OBESIDAD', etiqueta: 'Obesidad', rango: '≥30', flex: 10, color: '#FF4D1A', desde: 30, hasta: 40 },
];

export const COLOR_IMC: Record<ClasificacionImc, string> = Object.fromEntries(
  SEGMENTOS.map((s) => [s.clase, s.color]),
) as Record<ClasificacionImc, string>;

export const MENSAJE_IMC: Record<ClasificacionImc, string> = {
  BAJO_PESO: 'Tu rutina se enfocará en ganar fuerza y masa muscular, sin afán.',
  NORMAL: 'Estás en rango. Vamos por fuerza, resistencia y constancia.',
  SOBREPESO: 'Arrancamos con cardio de bajo impacto y fuerza. Paso a paso, sin castigo.',
  OBESIDAD: 'Empezamos suave, cuidando rodillas y espalda. Lo importante es arrancar.',
};

/** Posición (0–100 %) del marcador sobre la barra, respetando el ancho de cada tramo. */
export function posicionImc(imc: number): number {
  const total = SEGMENTOS.reduce((t, s) => t + s.flex, 0);
  let acum = 0;
  for (const s of SEGMENTOS) {
    if (imc < s.hasta || s === SEGMENTOS[SEGMENTOS.length - 1]) {
      const k = Math.min(1, Math.max(0, (imc - s.desde) / (s.hasta - s.desde)));
      return ((acum + k * s.flex) / total) * 100;
    }
    acum += s.flex;
  }
  return 100;
}

export function MedidorImc({ imc, compacto = false }: { imc: number | null; compacto?: boolean }) {
  const actual = imc != null ? clasificarImc(imc) : null;
  return (
    <div className="relative pt-1.5">
      <div className="flex gap-1">
        {SEGMENTOS.map((s) => {
          const on = s.clase === actual;
          return (
            <div key={s.clase} className="flex min-w-0 flex-col gap-2" style={{ flex: s.flex }}>
              <div
                className="h-4 transition-colors duration-arranque"
                style={{ background: on ? s.color : actual ? '#2A2A2E' : s.color, opacity: on || !actual ? 1 : 0.9 }}
              />
              {!compacto && (
                <div className="text-xs font-semibold leading-tight" style={{ color: on ? s.color : '#9A9AA0' }}>
                  {s.etiqueta}
                  <br />
                  <span className="font-metrica font-normal">{s.rango}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {imc != null && (
        <div
          aria-hidden
          className="absolute top-0 -ml-0.5 h-7 w-1 bg-hueso shadow-[0_0_0_2px_#0B0B0C] transition-[left] duration-500 ease-fitia"
          style={{ left: `${posicionImc(imc)}%` }}
        />
      )}
    </div>
  );
}
