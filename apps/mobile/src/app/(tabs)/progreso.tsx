import { useCallback, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { fechaCorta, formatoNumero, racha, semanaIso, type Progreso } from '@fitia/shared';
import { api } from '@/api';
import { useSesion } from '@/sesion/SesionContext';
import { useDatos } from '@/hooks/useDatos';
import { useRecargarAlVolver } from '@/hooks/useRecargarAlVolver';
import { F, MAX_ESCALA, c } from '@/tema';
import { Pantalla } from '@/ui/Pantalla';
import { Rejilla, Tarjeta } from '@/ui/Controles';
import { Cargando, ErrorEstado, Vacio } from '@/ui/Estados';
import { Grafica, type Punto } from '@/ui/Grafica';
import { RUTAS } from '@/ui/Iconos';
import { Etiqueta, Metrica, Titulo } from '@/ui/Texto';
import Svg, { Path } from 'react-native-svg';

type Pestana = 'peso' | 'imc' | 'adh';
const SEMANAS = 10;
const DIA = 86400000;

/** Últimas N semanas ISO, con 0 en las semanas sin sesiones (la vista solo trae las que tienen). */
function semanasRecientes(p: Progreso) {
  const porSemana = new Map(p.adherencia_semanal.map((s) => [s.semana_iso, s.sesiones]));
  return Array.from({ length: SEMANAS }, (_, i) => {
    const iso = semanaIso(new Date(Date.now() - (SEMANAS - 1 - i) * 7 * DIA));
    return { iso, n: porSemana.get(iso) ?? 0 };
  });
}

export default function ProgresoPantalla() {
  const { perfil } = useSesion();
  // Un año: alcanza para la gráfica y para los logros (rachas y total de sesiones)
  const cargar = useCallback(() => api.progreso(365), []);
  const { datos, cargando, refrescando, error, recargar } = useDatos(cargar);
  useRecargarAlVolver(recargar);
  const [tab, setTab] = useState<Pestana>('peso');
  const [sel, setSel] = useState<number | null>(null);
  const meta = perfil?.perfil?.dias_disponibles ?? 3;

  const vista = useMemo(() => {
    if (!datos) return null;
    const corp = datos.corporal.map((q) => ({ t: new Date(q.fecha.slice(0, 10)).getTime(), peso: Number(q.peso_kg), imc: Number(q.imc), fecha: q.fecha }));
    const sem = semanasRecientes(datos);
    const t0 = corp[0]?.t ?? Date.now();
    const t1 = corp.length > 1 ? corp[corp.length - 1].t : t0 + DIA;
    const xDe = (t: number) => (corp.length > 1 ? (t - t0) / (t1 - t0) : 0.5);
    const lineas: Record<'peso' | 'imc', Punto[]> = {
      peso: corp.map((q) => ({ x: xDe(q.t), v: q.peso })),
      imc: corp.map((q) => ({ x: xDe(q.t), v: q.imc })),
    };
    const barras: Punto[] = sem.map((s, i) => ({ x: (i + 0.5) / SEMANAS, v: s.n }));
    const totalSesiones = datos.adherencia_semanal.reduce((a, s) => a + s.sesiones, 0);
    const semanasRacha = racha(datos.adherencia_semanal);
    const conMeta = sem.filter((s) => s.n >= meta).length;
    return { corp, sem, lineas, barras, totalSesiones, semanasRacha, conMeta, diasCon: corp.length ? Math.max(1, Math.round((Date.now() - t0) / DIA)) : 0 };
  }, [datos, meta]);

  if (cargando) return <Pantalla><Cargando texto="Cargando tu progreso…" /></Pantalla>;
  if (!datos || !vista) return <Pantalla><ErrorEstado error={error} onReintentar={recargar} /></Pantalla>;

  const { corp, sem, lineas, barras } = vista;
  const esBarras = tab === 'adh';
  const puntos = esBarras ? barras : lineas[tab];
  const i = sel ?? puntos.length - 1;
  const primero = corp[0];
  const ultimo = corp[corp.length - 1];
  const valor = esBarras ? String(sem[i]?.n ?? 0) : puntos[i] ? formatoNumero(puntos[i].v, tab === 'imc' ? 2 : 1) : '—';
  const rotulo = esBarras
    ? `SESIONES · ${i === SEMANAS - 1 ? 'ESTA SEMANA' : `HACE ${SEMANAS - 1 - i} SEM`}`
    : corp[i] ? fechaCorta(corp[i].fecha).toUpperCase() : '';
  const delta = esBarras
    ? `${Math.round((vista.conMeta / SEMANAS) * 100)} % META`
    : primero && ultimo && corp.length > 1
      ? (() => {
          const d = tab === 'peso' ? ultimo.peso - primero.peso : ultimo.imc - primero.imc;
          return `${d > 0 ? '+' : d < 0 ? '−' : ''}${formatoNumero(Math.abs(d), tab === 'imc' ? 2 : 1)}${tab === 'peso' ? ' kg' : ''}`;
        })()
      : '—';
  const bajando = !esBarras && primero && ultimo && ultimo.peso <= primero.peso;

  return (
    <Pantalla onRefrescar={recargar} refrescando={refrescando}>
      <View>
        <Etiqueta color={c.voltaje}>{vista.diasCon ? `${vista.diasCon} DÍAS CON FITIA` : 'TU PROGRESO'}</Etiqueta>
        <Titulo tam={44} style={{ marginTop: 4 }}>Progreso</Titulo>
      </View>
      <Rejilla
        unida
        display={false}
        alto={52}
        columnas={3}
        valor={tab}
        onElegir={(t) => { setTab(t); setSel(null); }}
        opciones={[{ valor: 'peso' as Pestana, etiqueta: 'Peso' }, { valor: 'imc' as Pestana, etiqueta: 'IMC' }, { valor: 'adh' as Pestana, etiqueta: 'Adherencia' }]}
      />

      {!esBarras && corp.length === 0 ? (
        <Vacio
          titulo="Aún no hay datos"
          texto="Registra tu peso una vez por semana y aquí verás cómo cambia."
          accion="REGISTRAR MI PESO"
          onAccion={() => router.push('/imc')}
        />
      ) : (
        <Tarjeta>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 8 }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Etiqueta numberOfLines={1}>{rotulo}</Etiqueta>
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <Metrica tam={52} color={c.voltaje} style={{ flexShrink: 1 }}>{valor}</Metrica>
                <Text maxFontSizeMultiplier={MAX_ESCALA} style={{ fontFamily: F.mono, fontSize: 18, color: c.niebla }}>
                  {tab === 'peso' ? ' kg' : tab === 'adh' ? ` /${meta}` : ''}
                </Text>
              </View>
            </View>
            <View style={{ paddingVertical: 6, paddingHorizontal: 8, borderRadius: 2, backgroundColor: bajando || esBarras ? 'rgba(61,220,132,.14)' : 'rgba(255,176,32,.14)' }}>
              <Etiqueta tam={14} color={bajando || esBarras ? c.exito : c.advertencia}>{delta}</Etiqueta>
            </View>
          </View>
          <Grafica
            key={tab}
            tipo={esBarras ? 'barras' : 'linea'}
            puntos={puntos}
            meta={esBarras ? meta : undefined}
            escalaMax={esBarras ? Math.max(meta + 1, ...sem.map((s) => s.n)) : undefined}
            onSeleccion={setSel}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
            <Etiqueta numberOfLines={1}>{esBarras ? `HACE ${SEMANAS - 1} SEM` : primero ? fechaCorta(primero.fecha) : ''}</Etiqueta>
            <Etiqueta numberOfLines={1}>TOCA Y DESLIZA</Etiqueta>
            <Etiqueta numberOfLines={1}>{esBarras ? 'HOY' : ultimo ? fechaCorta(ultimo.fecha) : ''}</Etiqueta>
          </View>
        </Tarjeta>
      )}

      <Logros total={vista.totalSesiones} semanas={vista.semanasRacha} bajada={primero && ultimo ? primero.peso - ultimo.peso : 0} imc={ultimo?.imc ?? null} />
    </Pantalla>
  );
}

/** 6 logros derivados de /progreso (decisión 4 del plan): sin tabla de logros en la BD. */
function Logros({ total, semanas, bajada, imc }: { total: number; semanas: number; bajada: number; imc: number | null }) {
  const lista = [
    { l: 'Primera sesión', d: 'M7 4l13 8-13 8z', big: '01', v: total, m: 1, pt: 'ENTRENA UNA VEZ' },
    { l: '4 semanas seguidas', d: RUTAS.hoy, big: '4', v: semanas, m: 4, pt: `${semanas} DE 4` },
    { l: '8 semanas seguidas', d: RUTAS.hoy, big: '8', v: semanas, m: 8, pt: `${semanas} DE 8` },
    { l: '−3 kg', d: RUTAS.check, big: '−3', v: Math.max(0, bajada), m: 3, pt: `TE FALTAN ${formatoNumero(Math.max(0, 3 - bajada))} KG` },
    { l: '25 sesiones', d: RUTAS.rutina, big: '25', v: total, m: 25, pt: `${total} DE 25` },
    {
      l: 'IMC en rango normal', d: 'M3 20h18M4 16l5-5 4 3 7-7', big: 'OK',
      v: imc != null && imc < 25 && imc >= 18.5 ? 1 : 0, m: 1,
      pt: imc == null ? 'SIN MEDIDAS' : imc >= 25 ? `TE FALTAN ${formatoNumero(imc - 24.99, 2)}` : 'SUBE UN POCO',
    },
  ];
  const hechos = lista.filter((x) => x.v >= x.m).length;
  const filas = [lista.slice(0, 2), lista.slice(2, 4), lista.slice(4, 6)];
  return (
    <>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Titulo tam={28}>Logros</Titulo>
        <Etiqueta tam={14}>{`${hechos}/6`}</Etiqueta>
      </View>
      {filas.map((fila, k) => (
        <View key={k} style={{ flexDirection: 'row', gap: 10 }}>
          {fila.map((x) => {
            const on = x.v >= x.m;
            return (
              <View
                key={x.l}
                accessibilityLabel={`${x.l}: ${on ? 'logrado' : x.pt.toLowerCase()}`}
                style={{
                  flex: 1, minWidth: 0, minHeight: 132, padding: 14, borderRadius: 4, overflow: 'hidden', justifyContent: 'space-between', gap: 8,
                  backgroundColor: on ? c.concreto : 'transparent', borderWidth: 1, borderStyle: on ? 'solid' : 'dashed', borderColor: on ? c.voltaje : c.grafito,
                }}
              >
                <Text aria-hidden maxFontSizeMultiplier={1} style={{ position: 'absolute', right: -6, bottom: -18, fontFamily: F.titulo, fontSize: 72, lineHeight: 80, color: on ? 'rgba(212,255,0,.12)' : '#141416' }}>
                  {x.big}
                </Text>
                <View style={{ width: 36, height: 36, borderRadius: 2, backgroundColor: on ? c.voltaje : c.grafito, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-7deg' }] }}>
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                    <Path d={x.d} stroke={on ? c.asfalto : c.niebla} strokeWidth={2.5} strokeLinecap="square" />
                  </Svg>
                </View>
                <Titulo tam={20} color={on ? c.hueso : c.niebla} lineas={2}>{x.l}</Titulo>
                {!on ? (
                  <View style={{ gap: 4 }}>
                    <View style={{ height: 6, backgroundColor: c.grafito }}>
                      <View style={{ height: '100%', width: `${Math.min(100, (x.v / x.m) * 100)}%`, backgroundColor: c.niebla }} />
                    </View>
                    <Etiqueta numberOfLines={1}>{x.pt}</Etiqueta>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      ))}
    </>
  );
}
