import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { DIFICULTADES, TIPOS_EJERCICIO, type Dificultad, type Ejercicio, type TipoEjercicio } from '@fitia/shared';
import { api } from '../api';
import { useDatos } from '../hooks/useDatos';
import { Boton } from '../ui/Boton';
import { ErrorEstado, Esqueleto } from '../ui/Estados';
import { Icono } from '../ui/Iconos';

const TIPOS: ('TODOS' | TipoEjercicio)[] = ['TODOS', 'MOVILIDAD', 'ESTIRAMIENTO', 'CORE', 'FUERZA', 'CARDIO'];
const NIVELES: ('TODOS' | Dificultad)[] = ['TODOS', 'PRINCIPIANTE', 'INTERMEDIO'];
const sinTildes = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function Chips<T extends string>({ valor, opciones, onCambio, etiqueta, nombre }: { valor: T; opciones: T[]; onCambio: (v: T) => void; etiqueta: (v: T) => string; nombre: string }) {
  return (
    <div role="group" aria-label={nombre} className="flex flex-wrap gap-2">
      {opciones.map((o) => (
        <button
          key={o}
          type="button"
          aria-pressed={o === valor}
          onClick={() => onCambio(o)}
          className={`min-h-[44px] rounded-sm border-2 px-3.5 text-sm font-semibold ${o === valor ? 'border-voltaje bg-voltaje text-asfalto' : 'border-grafito hover:border-niebla'}`}
        >
          {etiqueta(o)}
        </button>
      ))}
    </div>
  );
}

export function Lumbar() {
  const { datos, cargando, error, recargar } = useDatos(
    () => Promise.all([api.ejercicios.listar({ lumbar: true }), api.ejercicios.seguros()]) as Promise<[Ejercicio[], Ejercicio[]]>,
  );
  const [q, setQ] = useState('');
  const [tipo, setTipo] = useState<'TODOS' | TipoEjercicio>('TODOS');
  const [nivel, setNivel] = useState<'TODOS' | Dificultad>('TODOS');
  const [solo, setSolo] = useState(false);

  const segurosIds = useMemo(() => new Set((datos?.[1] ?? []).map((e) => e.id)), [datos]);
  const todos = datos?.[0] ?? [];
  const nq = sinTildes(q.trim());
  const lista = todos.filter(
    (e) =>
      (!nq || sinTildes(`${e.nombre} ${e.grupo} ${e.instrucciones ?? ''}`).includes(nq)) &&
      (tipo === 'TODOS' || e.tipo === tipo) &&
      (nivel === 'TODOS' || e.dificultad === nivel) &&
      (!solo || segurosIds.has(e.id)),
  );
  const limpiar = () => {
    setQ('');
    setTipo('TODOS');
    setNivel('TODOS');
    setSolo(false);
  };

  return (
    <div className="flex animate-entrada flex-col gap-5">
      <header>
        <div className="kicker text-exito">BIBLIOTECA · MOLESTIA LUMBAR</div>
        <h1 className="mt-2 font-titulo text-[clamp(40px,5vw,72px)] font-normal uppercase leading-[.9]">Cuida tu espalda.</h1>
        <p className="mt-3 max-w-[640px] text-[17px] text-niebla">
          Ejercicios elegidos para fortalecer y aliviar la zona lumbar. El sello verde indica los que la base de datos considera seguros para ti hoy, según tus condiciones.
        </p>
      </header>

      <div className="tarjeta flex flex-col gap-4 p-5">
        <label className="flex min-h-[52px] items-center gap-3 rounded border-2 border-grafito bg-carbon px-4 focus-within:border-voltaje">
          <Icono nombre="buscar" className="text-niebla" />
          <span className="sr-only">Buscar ejercicio</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar ejercicio" className="w-0 min-w-0 flex-1 bg-transparent text-base text-hueso placeholder:text-humo focus:outline-none" />
        </label>
        <Chips nombre="Tipo" valor={tipo} opciones={TIPOS} onCambio={setTipo} etiqueta={(t) => (t === 'TODOS' ? 'Todos' : TIPOS_EJERCICIO[t])} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Chips nombre="Nivel" valor={nivel} opciones={NIVELES} onCambio={setNivel} etiqueta={(n) => (n === 'TODOS' ? 'Todos los niveles' : DIFICULTADES[n])} />
          <label className="flex min-h-[44px] cursor-pointer items-center gap-3 font-semibold">
            <input type="checkbox" className="peer sr-only" checked={solo} onChange={(e) => setSolo(e.target.checked)} />
            <span className={`relative h-7 w-12 rounded-sm border-2 transition-colors peer-focus-visible:shadow-foco ${solo ? 'border-exito bg-exito' : 'border-grafito'}`}>
              <span className={`absolute top-0.5 h-5 w-5 bg-hueso transition-[left] ${solo ? 'left-[22px] bg-asfalto' : 'left-0.5'}`} />
            </span>
            Solo seguros para mí
          </label>
        </div>
      </div>

      <div className="font-metrica text-[13px] text-niebla" aria-live="polite">
        {cargando ? 'CARGANDO EJERCICIOS…' : `${lista.length} DE ${todos.length} EJERCICIOS`}
      </div>

      {error ? (
        <ErrorEstado error={error} onReintentar={recargar} />
      ) : cargando && !datos ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Esqueleto key={i} className="h-44" />
          ))}
        </div>
      ) : lista.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded border border-dashed border-grafito p-10">
          <span className="font-titulo text-[96px] leading-none text-grafito">0</span>
          <h2 className="font-titulo text-3xl uppercase">Nada por aquí</h2>
          <p className="text-niebla">No hay ejercicios{q ? ` con “${q}”` : ''} y esos filtros. Prueba con otra palabra.</p>
          <Boton variante="secundario" tam="sm" onClick={limpiar}>
            Limpiar filtros
          </Boton>
        </div>
      ) : (
        <ul className="m-0 grid grid-cols-1 list-none gap-3 p-0 sm:grid-cols-2 xl:grid-cols-3">
          {lista.map((e, i) => {
            const seguro = segurosIds.has(e.id);
            return (
              <li key={e.id}>
                <Link
                  to={`/app/ejercicio/${e.id}`}
                  state={{ desde: 'lumbar' }}
                  className="relative flex h-full flex-col gap-3 overflow-hidden rounded border border-grafito bg-concreto p-5 text-hueso no-underline transition-[transform,box-shadow] duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:text-hueso hover:shadow-[6px_6px_0_#3DDC84]"
                >
                  <span aria-hidden className="absolute -right-1 -top-4 font-titulo text-[80px] leading-none text-[#232327]">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="relative etiqueta text-niebla">{TIPOS_EJERCICIO[e.tipo].toUpperCase()}</span>
                  <span className="relative font-titulo text-[26px] uppercase leading-none">{e.nombre}</span>
                  <span className="relative font-metrica text-[13px] text-niebla">
                    {e.grupo} · {e.equipo} · {DIFICULTADES[e.dificultad]}
                  </span>
                  <span className="relative mt-auto">
                    {seguro ? (
                      <span className="inline-flex items-center gap-1.5 rounded-sm bg-exito/10 px-2 py-1 text-[11px] font-bold tracking-[.08em] text-exito">
                        <Icono nombre="check" tam={14} grosor={3} /> SEGURO PARA TI
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-sm bg-advertencia/10 px-2 py-1 text-[11px] font-bold tracking-[.08em] text-advertencia">
                        <Icono nombre="alerta" tam={14} /> NO RECOMENDADO HOY
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
