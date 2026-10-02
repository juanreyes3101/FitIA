import { useState } from 'react';
import { CLASIFICACIONES_IMC, clasificarImc, colores, formatoNumero } from '@fitia/shared';
import { api } from '../api';
import { useSesion } from '../auth/SesionContext';
import { useDatos } from '../hooks/useDatos';
import { fechaCorta } from '../lib/rutina';
import { BotonLink } from '../ui/Boton';
import { Segmentado } from '../ui/Campos';
import { ErrorEstado, Esqueleto, Vacio } from '../ui/Estados';
import { colorDolor, etiquetaSemana, GraficaBarras, GraficaLinea } from '../ui/Graficas';

const RANGOS = [
  { valor: 30, etiqueta: '30 días' },
  { valor: 90, etiqueta: '90 días' },
  { valor: 365, etiqueta: '1 año' },
];

const signo = (n: number, d = 1) => `${n > 0 ? '+' : ''}${formatoNumero(n, d)}`;

export function Progreso() {
  const { perfil } = useSesion();
  const [rango, setRango] = useState(90);
  const { datos, cargando, error, recargar } = useDatos(() => api.progreso(rango), [rango]);
  const meta = perfil?.perfil?.dias_disponibles ?? 3;

  const encabezado = (titular: string, desde?: string) => (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="kicker">PROGRESO{desde ? ` · DESDE EL ${desde.toUpperCase()}` : ''}</div>
        <h1 className="mt-2 font-titulo text-[clamp(40px,5vw,72px)] font-normal uppercase leading-[.9]">{titular}</h1>
      </div>
      <Segmentado etiqueta="Rango de fechas" opciones={RANGOS} valor={rango} onCambio={setRango} />
    </header>
  );

  if (cargando && !datos)
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        {encabezado('Tu avance.')}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Esqueleto key={i} className="h-28" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Esqueleto className="h-72" />
          <Esqueleto className="h-72" />
        </div>
      </div>
    );
  if (error)
    return (
      <div className="flex flex-col gap-4">
        {encabezado('Tu avance.')}
        <ErrorEstado error={error} onReintentar={recargar} />
      </div>
    );

  const { corporal, adherencia_semanal: adh } = datos!;
  if (!corporal.length && !adh.length)
    return (
      <div className="flex flex-col gap-4">
        {encabezado('Tu avance.')}
        <Vacio
          numero="0 KG"
          titulo="Aún no hay nada que medir"
          texto="Entrena tu primera sesión y registra tu peso. Aquí verás peso, IMC, sesiones y dolor semana a semana."
          accion={<BotonLink to="/app/entreno">Empezar mi primera sesión</BotonLink>}
        />
      </div>
    );

  const primero = corporal[0];
  const ultimo = corporal[corporal.length - 1];
  const dPeso = ultimo && primero ? ultimo.peso_kg - primero.peso_kg : 0;
  const dImc = ultimo && primero ? ultimo.imc - primero.imc : 0;
  const conSesiones = adh.filter((s) => s.sesiones > 0);
  const promSesiones = conSesiones.length ? adh.reduce((t, s) => t + s.sesiones, 0) / adh.length : 0;
  const conDolor = adh.filter((s) => s.dolor_promedio != null);
  const d0 = conDolor[0]?.dolor_promedio ?? 0;
  const d1 = conDolor[conDolor.length - 1]?.dolor_promedio ?? 0;
  const titular = dPeso < 0 ? 'Vas bajando. Sin afán.' : dPeso > 0 && perfil?.perfil?.objetivo === 'GANAR_MASA' ? 'Vas ganando. Así es.' : 'Constancia ante todo.';

  const kpis = [
    { l: 'PESO', v: ultimo ? formatoNumero(ultimo.peso_kg, 1) : '--', u: ' kg', d: corporal.length > 1 ? `${signo(dPeso)} kg` : 'Una sola medición', c: dPeso <= 0 ? colores.exito : colores.advertencia },
    {
      l: 'IMC',
      v: ultimo ? formatoNumero(ultimo.imc, 2) : '--',
      u: '',
      d: ultimo ? `${corporal.length > 1 ? `${signo(dImc, 2)} · ` : ''}${CLASIFICACIONES_IMC[clasificarImc(ultimo.imc)].toLowerCase()}` : '',
      c: dImc <= 0 ? colores.exito : colores.advertencia,
    },
    { l: 'SESIONES / SEM', v: formatoNumero(promSesiones, 1), u: ` /${meta}`, d: `${Math.round((promSesiones / meta) * 100)} % de tu meta`, c: colores.hueso },
    { l: 'DOLOR PROMEDIO', v: formatoNumero(d1, 1), u: ' /10', d: conDolor.length > 1 ? `${signo(d1 - d0)} desde el inicio` : 'Última semana', c: d1 <= d0 ? colores.exito : colores.senal },
  ];

  return (
    <div className="flex animate-entrada flex-col gap-4">
      {encabezado(titular, primero ? fechaCorta(primero.fecha) : undefined)}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.l} className="tarjeta flex flex-col gap-2 p-5">
            <span className="font-metrica text-xs tracking-[.06em] text-niebla">{k.l}</span>
            <span className="cifra text-[clamp(32px,3.4vw,44px)] font-bold leading-none tracking-[-.03em]">
              {k.v}
              <span className="text-base font-normal text-niebla">{k.u}</span>
            </span>
            <span className="font-metrica text-[13px] font-bold" style={{ color: k.c }}>
              {k.d}
            </span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="tarjeta flex flex-col gap-3 p-6">
          <h2 className="flex items-baseline justify-between font-titulo text-2xl uppercase">
            Peso <span className="font-metrica text-xs text-niebla">KG</span>
          </h2>
          {corporal.length > 1 ? (
            <GraficaLinea etiqueta="Peso en el tiempo" datos={corporal.map((c) => ({ x: fechaCorta(c.fecha), y: c.peso_kg }))} unidad="kg" alto={240} />
          ) : (
            <p className="text-niebla">Necesitas al menos dos mediciones. Registra tu peso desde tu perfil.</p>
          )}
        </section>
        <section className="tarjeta flex flex-col gap-3 p-6">
          <h2 className="flex items-baseline justify-between font-titulo text-2xl uppercase">
            IMC <span className="font-metrica text-xs text-niebla">KG/M²</span>
          </h2>
          {corporal.length > 1 ? (
            <>
              <GraficaLinea
                etiqueta="IMC en el tiempo con los rangos de la OMS"
                datos={corporal.map((c) => ({ x: fechaCorta(c.fecha), y: c.imc }))}
                unidad=""
                decimales={2}
                alto={240}
                bandas={[
                  { desde: 18.5, hasta: 25, color: colores.exito, texto: 'NORMAL' },
                  { desde: 25, hasta: 30, color: colores.advertencia, texto: 'SOBREPESO' },
                  { desde: 30, hasta: 60, color: colores.senal, texto: 'OBESIDAD' },
                ]}
              />
              <div className="flex flex-wrap gap-4 font-metrica text-[11px] text-niebla">
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 bg-exito/40" /> NORMAL 18,5–24,9</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 bg-advertencia/40" /> SOBREPESO 25–29,9</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 bg-senal/40" /> OBESIDAD ≥30</span>
              </div>
            </>
          ) : (
            <p className="text-niebla">Necesitas al menos dos mediciones para ver la tendencia.</p>
          )}
        </section>
        <section className="tarjeta flex flex-col gap-3 p-6">
          <h2 className="flex items-baseline justify-between font-titulo text-2xl uppercase">
            Sesiones por semana <span className="font-metrica text-xs text-voltaje">META {meta}</span>
          </h2>
          {adh.length ? (
            <GraficaBarras
              etiqueta="Sesiones por semana frente a la meta"
              datos={adh.map((s) => ({ x: etiquetaSemana(s.semana_iso), y: s.sesiones }))}
              unidad="sesiones"
              max={Math.max(meta, ...adh.map((s) => s.sesiones))}
              referencia={{ y: meta, texto: `META ${meta}`, color: colores.voltaje }}
              colorBarra={(y) => (y >= meta ? colores.voltaje : '#8FA800')}
            />
          ) : (
            <p className="text-niebla">Todavía no registras sesiones en este rango.</p>
          )}
        </section>
        <section className="tarjeta flex flex-col gap-3 p-6">
          <h2 className="flex items-baseline justify-between font-titulo text-2xl uppercase">
            Dolor promedio <span className="font-metrica text-xs text-senal">ALERTA &gt;5</span>
          </h2>
          {conDolor.length ? (
            <GraficaBarras
              etiqueta="Dolor promedio por semana, de 0 a 10"
              datos={conDolor.map((s) => ({ x: etiquetaSemana(s.semana_iso), y: s.dolor_promedio ?? 0 }))}
              unidad="/10"
              decimales={1}
              max={10}
              referencia={{ y: 5, texto: 'ALERTA', color: colores.senal }}
              colorBarra={colorDolor}
            />
          ) : (
            <p className="text-niebla">Sin reportes de dolor en este rango.</p>
          )}
        </section>
      </div>

      <details className="tarjeta p-5">
        <summary className="cursor-pointer font-semibold">Ver los datos en tabla</summary>
        <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
          <table className="w-full text-left text-sm">
            <thead className="text-niebla">
              <tr><th className="py-2">Fecha</th><th>Peso (kg)</th><th>IMC</th></tr>
            </thead>
            <tbody className="font-metrica">
              {corporal.map((c) => (
                <tr key={c.fecha} className="border-t border-grafito"><td className="py-2">{fechaCorta(c.fecha)}</td><td>{formatoNumero(c.peso_kg, 1)}</td><td>{formatoNumero(c.imc, 2)}</td></tr>
              ))}
            </tbody>
          </table>
          <table className="w-full text-left text-sm">
            <thead className="text-niebla">
              <tr><th className="py-2">Semana</th><th>Sesiones</th><th>RPE</th><th>Dolor</th></tr>
            </thead>
            <tbody className="font-metrica">
              {adh.map((s) => (
                <tr key={s.semana_iso} className="border-t border-grafito">
                  <td className="py-2">{etiquetaSemana(s.semana_iso)}</td><td>{s.sesiones}</td>
                  <td>{s.rpe_promedio != null ? formatoNumero(s.rpe_promedio, 1) : '—'}</td>
                  <td>{s.dolor_promedio != null ? formatoNumero(s.dolor_promedio, 1) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
