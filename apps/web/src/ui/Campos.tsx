import { useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { Icono } from './Iconos';

type PropsCampo = InputHTMLAttributes<HTMLInputElement> & {
  etiqueta: string;
  error?: string | false;
  ayuda?: ReactNode;
  ok?: boolean;
  derecha?: ReactNode;
  extraEtiqueta?: ReactNode;
};

/** Campo de texto: reposo (Grafito) · foco (Voltaje) · error (rojo + mensaje) · válido (verde). */
export function Campo({ etiqueta, error, ayuda, ok, derecha, extraEtiqueta, className = '', id, ...props }: PropsCampo) {
  const auto = useId();
  const cid = id ?? auto;
  const borde = error ? 'border-error' : ok ? 'border-exito' : 'border-grafito focus-within:border-voltaje';
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={cid} className="text-sm font-semibold">
          {etiqueta}
        </label>
        {extraEtiqueta}
      </div>
      <div className={`flex min-h-[52px] items-stretch rounded border-2 bg-carbon transition-colors ${borde}`}>
        <input
          id={cid}
          aria-invalid={!!error || undefined}
          aria-describedby={error || ayuda ? `${cid}-msg` : undefined}
          className="w-0 min-w-0 flex-1 bg-transparent px-4 text-base text-hueso placeholder:text-humo focus:outline-none disabled:text-niebla"
          {...props}
        />
        {derecha}
      </div>
      {(error || ayuda) && (
        <span id={`${cid}-msg`} className={`flex items-center gap-1.5 text-sm ${error ? 'text-error' : 'text-niebla'}`}>
          {error && <Icono nombre="alerta" tam={16} />}
          {error || ayuda}
        </span>
      )}
    </div>
  );
}

/** Número con − y + (peso, estatura, edad). */
export function CampoNumero({
  etiqueta,
  valor,
  onCambio,
  unidad,
  paso = 1,
  error,
  ayuda,
  inputMode = 'decimal',
}: {
  etiqueta: string;
  valor: string;
  onCambio: (v: string) => void;
  unidad?: string;
  paso?: number;
  error?: string | false;
  ayuda?: ReactNode;
  inputMode?: 'decimal' | 'numeric';
}) {
  const id = useId();
  const bump = (d: number) => {
    const n = parseFloat(valor.replace(',', '.'));
    if (!isNaN(n)) onCambio(String(Math.round((n + d) * 10) / 10));
  };
  const btn =
    'w-[52px] flex-none bg-transparent font-metrica text-[22px] text-hueso hover:bg-concreto active:bg-grafito';
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-semibold">
        {etiqueta}
      </label>
      <div
        className={`flex min-h-[56px] items-stretch overflow-hidden rounded border-2 transition-colors ${
          error ? 'border-error' : 'border-grafito'
        }`}
      >
        <button type="button" className={`${btn} border-r border-grafito`} aria-label={`Restar ${paso} ${unidad ?? ''}`} onClick={() => bump(-paso)}>
          −
        </button>
        <input
          id={id}
          inputMode={inputMode}
          value={valor}
          onChange={(e) => onCambio(e.target.value)}
          className="w-0 min-w-0 flex-1 bg-transparent text-center font-metrica text-[26px] font-bold text-hueso focus:bg-concreto focus:outline-none"
        />
        {unidad && <span className="flex items-center pr-3 font-metrica text-niebla">{unidad}</span>}
        <button type="button" className={`${btn} border-l border-grafito`} aria-label={`Sumar ${paso} ${unidad ?? ''}`} onClick={() => bump(paso)}>
          +
        </button>
      </div>
      {(error || ayuda) && <span className={`text-sm ${error ? 'text-error' : 'text-niebla'}`}>{error || ayuda}</span>}
    </div>
  );
}

/** Casilla cuadrada (sin radios grandes). */
export function Casilla({
  marcada,
  onCambio,
  children,
  error,
}: {
  marcada: boolean;
  onCambio: (v: boolean) => void;
  children: ReactNode;
  error?: boolean;
}) {
  return (
    <label className="flex min-h-[44px] cursor-pointer items-start gap-3 text-[15px] leading-snug">
      <input type="checkbox" className="peer sr-only" checked={marcada} onChange={(e) => onCambio(e.target.checked)} />
      <span
        className={`mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-sm border-2 peer-focus-visible:shadow-foco ${
          marcada ? 'border-voltaje bg-voltaje text-asfalto' : error ? 'border-error' : 'border-grafito'
        }`}
      >
        {marcada && <Icono nombre="check" tam={16} grosor={3} />}
      </span>
      <span className="text-niebla [&_a]:text-voltaje [&_strong]:text-hueso">{children}</span>
    </label>
  );
}

/** Grupo segmentado (Mensual / Anual, rangos de progreso). */
export function Segmentado<T extends string | number>({
  opciones,
  valor,
  onCambio,
  etiqueta,
}: {
  opciones: { valor: T; etiqueta: string }[];
  valor: T;
  onCambio: (v: T) => void;
  etiqueta: string;
}) {
  return (
    <div role="group" aria-label={etiqueta} className="flex w-max overflow-hidden rounded border-2 border-grafito">
      {opciones.map((o) => {
        const on = o.valor === valor;
        return (
          <button
            key={String(o.valor)}
            type="button"
            aria-pressed={on}
            onClick={() => onCambio(o.valor)}
            className={`min-h-[48px] px-5 text-[15px] font-semibold ${on ? 'bg-voltaje text-asfalto' : 'text-hueso hover:bg-concreto'}`}
          >
            {o.etiqueta}
          </button>
        );
      })}
    </div>
  );
}

/** Tarjeta de opción grande (onboarding: actividad, objetivo, molestias). */
export function Opcion({
  activa,
  onClick,
  titulo,
  detalle,
  marca,
}: {
  activa: boolean;
  onClick: () => void;
  titulo: string;
  detalle?: string;
  marca?: 'check' | 'radio';
}) {
  return (
    <button
      type="button"
      aria-pressed={activa}
      onClick={onClick}
      className={`flex min-h-[64px] w-full items-center gap-3 rounded border-2 px-4 py-3 text-left transition-colors duration-golpe ${
        activa ? 'border-voltaje bg-voltaje text-asfalto' : 'border-grafito text-hueso hover:border-niebla'
      }`}
    >
      {marca && (
        <span
          className={`flex h-6 w-6 flex-none items-center justify-center border-2 ${
            marca === 'radio' ? 'rounded-full' : 'rounded-sm'
          } ${activa ? 'border-asfalto' : 'border-grafito'}`}
        >
          {activa && <Icono nombre="check" tam={14} grosor={3} />}
        </span>
      )}
      <span className="flex flex-col">
        <span className="text-base font-semibold">{titulo}</span>
        {detalle && <span className={`text-sm ${activa ? 'text-asfalto/80' : 'text-niebla'}`}>{detalle}</span>}
      </span>
    </button>
  );
}
