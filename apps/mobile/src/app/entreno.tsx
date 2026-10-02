// Modo entreno a pantalla completa (docs/diseno/movil/FitiaMovEntreno): serie → descanso → evaluación
// (RPE y dolor) → "¡Sesión lista!" o "Cuidémonos". Los relojes se calculan con marcas de tiempo, no
// contando ticks: si el celular bloquea la pantalla o la app pasa a segundo plano, no se atrasan.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, BackHandler, PanResponder, Pressable, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { diaDeHoy, sesionesEstaSemana, type Ejercicio, type SesionRegistrada } from '@fitia/shared';
import { api } from '@/api';
import { useSesion } from '@/sesion/SesionContext';
import { marcarSesionHoy, rutinaActivaONula } from '@/lib/datos';
import { DESCANSO_RAPIDA, SEG_RAPIDA, rapidaLumbar } from '@/lib/lumbar';
import { useDatos } from '@/hooks/useDatos';
import * as vib from '@/lib/vibracion';
import { F, MAX_ESCALA, c } from '@/tema';
import { Boton } from '@/ui/Boton';
import { Cargando, ErrorEstado, Vacio, mensajeError } from '@/ui/Estados';
import { Icono, Pausa } from '@/ui/Iconos';
import { Cuerpo, Etiqueta, Metrica, Titulo } from '@/ui/Texto';

interface Paso {
  ejercicio_id: number;
  nombre: string;
  series: number;
  repeticiones: number | null;
  duracion_seg: number | null;
  descanso_seg: number;
}

interface Plan {
  pasos: Paso[];
  rutinaDiaId: number | null;
  titulo: string;
  hechasSemana: number;
  meta: number;
}

const RPE = ['', 'Muy fácil', 'Fácil', 'Fácil', 'Moderado', 'Moderado', 'Algo duro', 'Duro', 'Muy duro', 'Casi máximo', 'Máximo'];
const DOL = ['Nada', 'Casi nada', 'Leve', 'Leve', 'Moderado', 'Moderado', 'Fuerte', 'Fuerte', 'Muy fuerte', 'Muy fuerte', 'Insoportable'];
const colorDolor = (n: number) => (n <= 3 ? c.exito : n <= 5 ? c.advertencia : c.senal);
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const ANILLO = 2 * Math.PI * 120;

type Fase = 'serie' | 'descanso' | 'eval' | 'cuidado' | 'ok';

/** La pantalla no se apaga mientras entrena. Sin useKeepAwake: en la web lanza un error al salir
 *  si el navegador no alcanzó a activar el bloqueo; aquí cualquier falla se ignora. */
function usePantallaEncendida() {
  useEffect(() => {
    const tag = 'fitia-entreno';
    activateKeepAwakeAsync(tag).catch(() => {});
    return () => {
      deactivateKeepAwake(tag).catch(() => {});
    };
  }, []);
}

export default function Entreno() {
  usePantallaEncendida();
  const { dia, lumbar } = useLocalSearchParams<{ dia?: string; lumbar?: string }>();
  const { perfil } = useSesion();
  const cargar = useCallback(async (): Promise<Plan | null> => {
    const progreso = api.progreso(14).then((p) => sesionesEstaSemana(p.adherencia_semanal)).catch(() => 0);
    const meta = perfil?.perfil?.dias_disponibles ?? 3;
    if (lumbar) {
      const [lista, hechas] = await Promise.all([api.ejercicios.listar({ lumbar: true }), progreso]);
      const pasos = rapidaLumbar(lista).map((e) => ({ ejercicio_id: e.id, nombre: e.nombre, series: 1, repeticiones: null, duracion_seg: SEG_RAPIDA, descanso_seg: DESCANSO_RAPIDA }));
      return pasos.length ? { pasos, rutinaDiaId: null, titulo: 'Espalda en 10 min', hechasSemana: hechas, meta } : null;
    }
    const [rutina, hechas] = await Promise.all([rutinaActivaONula(), progreso]);
    if (!rutina) return null;
    const d = rutina.dias.find((x) => String(x.rutina_dia_id) === dia) ?? diaDeHoy(rutina, hechas);
    if (!d) return null;
    return { pasos: d.ejercicios, rutinaDiaId: d.rutina_dia_id, titulo: `Día ${d.dia_numero}`, hechasSemana: hechas, meta };
  }, [dia, lumbar, perfil?.perfil?.dias_disponibles]);
  const { datos, cargando, error, recargar } = useDatos(cargar, [dia, lumbar]);
  const ins = useSafeAreaInsets();

  if (cargando || !datos)
    return (
      <View style={{ flex: 1, backgroundColor: c.asfalto, paddingTop: ins.top + 12, paddingHorizontal: 16, gap: 16 }}>
        {cargando ? (
          <Cargando texto="Preparando tu entreno…" />
        ) : error ? (
          <ErrorEstado error={error} onReintentar={recargar} />
        ) : (
          <Vacio titulo="Nada para entrenar" texto="Aún no tienes una rutina activa. Ármala desde la pestaña Rutina." accion="IR A MI RUTINA" onAccion={() => router.replace('/rutina')} />
        )}
        {!cargando ? <Boton variante="secundario" onPress={() => router.back()}>Volver</Boton> : null}
      </View>
    );
  return <Sesion plan={datos} />;
}

function Sesion({ plan }: { plan: Plan }) {
  const ins = useSafeAreaInsets();
  const L = plan.pasos;
  const [fase, setFase] = useState<Fase>('serie');
  const [ex, setEx] = useState(0);
  const [serie, setSerie] = useState(1);
  const [hechasPorEj, setHechasPorEj] = useState<Record<number, number>>({});
  const [pausado, setPausado] = useState(false);
  const [rpe, setRpe] = useState<number | null>(null);
  const [dolor, setDolor] = useState<number | null>(null);
  const [intento, setIntento] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null);
  const [resultado, setResultado] = useState<SesionRegistrada | null>(null);
  const [movilidad, setMovilidad] = useState<Ejercicio[]>([]);

  // ---- Relojes por marcas de tiempo
  const inicio = useRef(Date.now());
  const pausaDesde = useRef<number | null>(null);
  const pausaTotal = useRef(0);
  const finDescanso = useRef(0);
  const descansoTotal = useRef(60);
  const ultimoAviso = useRef(0);
  const [ahora, setAhora] = useState(Date.now());
  const [finEntreno, setFinEntreno] = useState<number | null>(null);

  const transcurrido = Math.max(0, Math.floor(((finEntreno ?? (pausaDesde.current ?? ahora)) - inicio.current - pausaTotal.current) / 1000));
  const resta = Math.max(0, Math.ceil((finDescanso.current - (pausaDesde.current ?? ahora)) / 1000));
  const hechas = Object.values(hechasPorEj).reduce((a, b) => a + b, 0);
  const totalSeries = L.reduce((a, e) => a + e.series, 0);

  useEffect(() => {
    if (fase !== 'serie' && fase !== 'descanso') return;
    const t = setInterval(() => setAhora(Date.now()), 250);
    return () => clearInterval(t);
  }, [fase]);

  // Fin del descanso y aviso de los últimos 3 s (una vibración por segundo)
  useEffect(() => {
    if (fase !== 'descanso' || pausado) return;
    if (resta <= 0) {
      vib.finDescanso();
      setFase('serie');
    } else if (resta <= 3 && ultimoAviso.current !== resta) {
      ultimoAviso.current = resta;
      vib.aviso();
    }
  }, [fase, pausado, resta]);

  const pausar = useCallback(() => {
    if (pausaDesde.current == null) pausaDesde.current = Date.now();
    setPausado(true);
  }, []);
  function reanudar() {
    if (pausaDesde.current != null) {
      const p = Date.now() - pausaDesde.current;
      pausaTotal.current += p;
      finDescanso.current += p; // el descanso también se congela durante la pausa
      pausaDesde.current = null;
    }
    setAhora(Date.now());
    setPausado(false);
  }
  function terminar() {
    reanudar();
    setFinEntreno(Date.now());
    setFase('eval');
  }

  // Botón "atrás" de Android: pausa en vez de salir y perder la sesión
  useEffect(() => {
    const s = BackHandler.addEventListener('hardwareBackPress', () => {
      if (fase === 'serie' || fase === 'descanso') {
        pausar();
        return true;
      }
      return false;
    });
    return () => s.remove();
  }, [fase, pausar]);

  function descansar(seg: number) {
    descansoTotal.current = seg;
    finDescanso.current = Date.now() + seg * 1000;
    ultimoAviso.current = 0;
    setAhora(Date.now());
    setFase('descanso');
  }

  function serieLista() {
    const cur = L[ex];
    if (!cur) return;
    vib.golpe();
    setHechasPorEj((h) => ({ ...h, [ex]: (h[ex] ?? 0) + 1 }));
    if (serie < cur.series) {
      setSerie(serie + 1);
      if (cur.descanso_seg) descansar(cur.descanso_seg);
    } else if (ex < L.length - 1) {
      setEx(ex + 1);
      setSerie(1);
      descansar(cur.descanso_seg || 30);
    } else {
      setFinEntreno(Date.now());
      setFase('eval');
    }
  }

  function mover(d: number) {
    const n = ex + d;
    if (n < 0) return;
    if (n >= L.length) {
      setFinEntreno(Date.now());
      setFase('eval');
      return;
    }
    vib.toque();
    setEx(n);
    setSerie(1);
    setFase('serie');
  }

  // Deslizar ← → entre ejercicios (umbral de 70 px, como el diseño)
  const dx = useRef(new Animated.Value(0)).current;
  const moverRef = useRef(mover);
  moverRef.current = mover;
  const gesto = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderMove: (_, g) => dx.setValue(Math.max(-140, Math.min(140, g.dx))),
        onPanResponderRelease: (_, g) => {
          Animated.spring(dx, { toValue: 0, useNativeDriver: true }).start();
          if (g.dx < -70) moverRef.current(1);
          else if (g.dx > 70) moverRef.current(-1);
        },
        onPanResponderTerminate: () => Animated.spring(dx, { toValue: 0, useNativeDriver: true }).start(),
      }),
    [dx],
  );

  async function guardar() {
    if (rpe == null || dolor == null) {
      setIntento(true);
      vib.error();
      setTimeout(() => setIntento(false), 320);
      return;
    }
    setGuardando(true);
    setErrorGuardar(null);
    try {
      const r = await api.sesiones.registrar({
        rutina_dia_id: plan.rutinaDiaId,
        duracion_min: Math.max(1, Math.round(transcurrido / 60)),
        esfuerzo_percibido: rpe,
        dolor_reportado: dolor,
        completada: hechas >= totalSeries,
        ejercicios: L.map((e, i) => ({ ejercicio_id: e.ejercicio_id, series_hechas: hechasPorEj[i] ?? 0 })).filter((e) => e.series_hechas > 0),
      });
      marcarSesionHoy(rpe, dolor);
      setResultado(r);
      if (r.alerta_dolor) {
        vib.error();
        // Movilidad suave sugerida: del catálogo lumbar, solo movilidad o estiramiento
        api.ejercicios.listar({ lumbar: true }).then((l) => setMovilidad(rapidaLumbar(l).slice(0, 3))).catch(() => {});
        setFase('cuidado');
      } else {
        vib.finDescanso();
        setFase('ok');
      }
    } catch (e) {
      setErrorGuardar(mensajeError(e));
    } finally {
      setGuardando(false);
    }
  }

  const cur = L[ex];
  const siguiente = L[ex] && fase === 'descanso' ? L[ex] : undefined;
  const porTiempo = !cur?.repeticiones && !!cur?.duracion_seg;
  const cifra = cur ? (cur.repeticiones ?? (cur.duracion_seg && cur.duracion_seg >= 120 && cur.duracion_seg % 60 === 0 ? cur.duracion_seg / 60 : cur.duracion_seg) ?? cur.series) : 0;
  const rotulo = cur?.repeticiones ? 'REPETICIONES' : porTiempo ? (cur!.duracion_seg! >= 120 && cur!.duracion_seg! % 60 === 0 ? 'MINUTOS' : 'SEGUNDOS') : 'SERIES';
  const bajo = resta <= 5;

  return (
    <View style={{ flex: 1, backgroundColor: c.asfalto, paddingTop: ins.top, paddingBottom: ins.bottom, overflow: 'hidden' }}>
      {fase === 'serie' || fase === 'descanso' ? (
        <View style={{ paddingTop: 8, paddingHorizontal: 12, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable
            onPress={pausar}
            accessibilityRole="button"
            accessibilityLabel="Pausar"
            style={({ pressed }) => ({ width: 52, height: 52, borderWidth: 2, borderColor: c.grafito, borderRadius: 4, alignItems: 'center', justifyContent: 'center', transform: [{ translateY: pressed ? 2 : 0 }] })}
          >
            <Pausa color={c.hueso} />
          </Pressable>
          <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingHorizontal: 7, borderRadius: 2, backgroundColor: c.senal }}>
                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: c.asfalto }} />
                <Etiqueta tam={11} color={c.asfalto}>EN VIVO</Etiqueta>
              </View>
              <Metrica tam={20} accessibilityLabel={`Tiempo ${mmss(transcurrido)}`}>{mmss(transcurrido)}</Metrica>
            </View>
            <View style={{ flexDirection: 'row', gap: 3 }}>
              {L.map((e, i) => (
                <View key={i} style={{ flex: 1, minWidth: 0, height: 6, backgroundColor: c.grafito }}>
                  <View style={{ height: '100%', width: `${i < ex ? 100 : i === ex ? ((serie - 1) / e.series) * 100 : 0}%`, backgroundColor: c.voltaje }} />
                </View>
              ))}
            </View>
          </View>
        </View>
      ) : null}

      {fase === 'serie' && cur ? (
        <View style={{ flex: 1 }} {...gesto.panHandlers}>
          <Animated.View style={{ flex: 1, paddingTop: 4, paddingHorizontal: 16, transform: [{ translateX: dx }] }}>
            <View style={{ height: 180, maxHeight: '30%', minHeight: 120, borderRadius: 4, overflow: 'hidden', backgroundColor: c.voltaje }}>
              <Text aria-hidden maxFontSizeMultiplier={1} style={{ position: 'absolute', right: 8, bottom: -24, fontFamily: F.titulo, fontSize: 120, lineHeight: 130, color: c.asfalto }}>
                {String(ex + 1).padStart(2, '0')}
              </Text>
              <View style={{ position: 'absolute', left: 10, top: 10, backgroundColor: c.asfalto, paddingVertical: 5, paddingHorizontal: 8, borderRadius: 2 }}>
                <Etiqueta tam={13} color={c.hueso}>{`${ex + 1}/${L.length}`}</Etiqueta>
              </View>
            </View>
            <Titulo tam={46} lineas={2} style={{ marginTop: 14 }}>{cur.nombre}</Titulo>
            <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
              <View style={{ flexShrink: 1, minWidth: 0 }}>
                <Text maxFontSizeMultiplier={1.1} numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: F.monoNegrita, fontSize: 100, lineHeight: 112, letterSpacing: -6, color: c.voltaje }}>
                  {String(cifra)}
                </Text>
                <Etiqueta tam={14} style={{ marginTop: 6 }}>{rotulo}</Etiqueta>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                <Titulo tam={30}>{`Serie ${serie}/${cur.series}`}</Titulo>
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  {Array.from({ length: cur.series }, (_, i) => (
                    <View key={i} style={{ width: 26, height: 12, backgroundColor: i < serie - 1 ? c.voltaje : i === serie - 1 ? c.hueso : c.grafito }} />
                  ))}
                </View>
              </View>
            </View>
          </Animated.View>
          <View style={{ paddingTop: 14, paddingHorizontal: 16, paddingBottom: 8, gap: 10 }}>
            <Boton display alto={84} tam={38} icono={<Icono nombre="check" tam={32} grosor={3} color={c.asfalto} />} onPress={serieLista}>
              SERIE LISTA
            </Boton>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Pressable onPress={() => mover(-1)} disabled={ex === 0} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 6 }}>
                <Etiqueta tam={13} color={ex === 0 ? '#5A5A60' : c.hueso}>‹ ANTERIOR</Etiqueta>
              </Pressable>
              <Etiqueta tam={13}>DESLIZA ↔</Etiqueta>
              <Pressable onPress={() => mover(1)} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 6 }}>
                <Etiqueta tam={13} color={c.hueso}>SIGUIENTE ›</Etiqueta>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}

      {fase === 'descanso' ? (
        <ScrollView contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: 18, paddingHorizontal: 16, paddingBottom: 12 }}>
          <Titulo tam={52} style={{ textAlign: 'center' }}>{bajo ? '¡Prepárate!' : 'Descansa'}</Titulo>
          <View accessibilityRole="timer" accessibilityLabel={`Quedan ${resta} segundos`} style={{ width: '76%', maxWidth: 280, aspectRatio: 1 }}>
            <Svg viewBox="0 0 280 280" width="100%" height="100%" style={{ transform: [{ rotate: '-90deg' }] }}>
              <Circle cx={140} cy={140} r={120} fill="none" stroke={c.concreto} strokeWidth={20} />
              <Circle
                cx={140} cy={140} r={120} fill="none" stroke={bajo ? c.senal : c.voltaje} strokeWidth={20}
                strokeDasharray={ANILLO} strokeDashoffset={ANILLO * (1 - (descansoTotal.current ? resta / descansoTotal.current : 0))}
              />
            </Svg>
            <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <Text maxFontSizeMultiplier={1.1} style={{ fontFamily: F.monoNegrita, fontSize: 72, letterSpacing: -3, color: bajo ? c.senal : c.voltaje }}>{mmss(resta)}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icono nombre="vibrar" tam={14} color={c.niebla} />
                <Etiqueta tam={12}>{vib.vibracionActiva() ? 'VIBRA AL TERMINAR' : 'VIBRACIÓN APAGADA'}</Etiqueta>
              </View>
            </View>
          </View>
          {siguiente ? (
            <View style={{ alignSelf: 'stretch', padding: 14, backgroundColor: c.concreto, borderWidth: 1, borderColor: c.grafito, borderRadius: 4 }}>
              <Etiqueta>SIGUIENTE</Etiqueta>
              <Cuerpo tam={17} peso="negrita">{`${siguiente.nombre} · serie ${serie}/${siguiente.series}`}</Cuerpo>
            </View>
          ) : null}
          <View style={{ alignSelf: 'stretch', flexDirection: 'row', gap: 10 }}>
            <Boton
              variante="secundario"
              alto={64}
              style={{ flex: 1 }}
              onPress={() => {
                finDescanso.current += 15000;
                descansoTotal.current = Math.max(descansoTotal.current, resta + 15);
                setAhora(Date.now());
              }}
            >
              +15 s
            </Boton>
            <Boton alto={64} tam={18} style={{ flex: 1.4 }} onPress={() => setFase('serie')}>Saltar descanso</Boton>
          </View>
        </ScrollView>
      ) : null}

      {fase === 'eval' ? (
        <ScrollView contentContainerStyle={{ paddingTop: 16, paddingHorizontal: 16, paddingBottom: 16, gap: 22 }}>
          <View>
            <Etiqueta tam={13} color={c.voltaje}>{`TERMINASTE · ${mmss(transcurrido)} · ${hechas} SERIES`}</Etiqueta>
            <Titulo tam={52} style={{ marginTop: 6 }}>¿Cómo te fue?</Titulo>
          </View>
          <Escala
            titulo="Esfuerzo (RPE)"
            valores={Array.from({ length: 10 }, (_, i) => i + 1)}
            columnas={5}
            valor={rpe}
            onElegir={setRpe}
            texto={rpe == null ? 'Elige 1–10' : `${rpe} · ${RPE[rpe]}`}
            color={() => c.voltaje}
            extremos={['1 Muy fácil', '10 Máximo']}
            error={intento && rpe == null}
          />
          <Escala
            titulo="Dolor en la espalda"
            valores={Array.from({ length: 11 }, (_, i) => i)}
            columnas={6}
            valor={dolor}
            onElegir={setDolor}
            texto={dolor == null ? 'Elige 0–10' : `${dolor} · ${DOL[dolor]}`}
            color={colorDolor}
            extremos={['0 Nada', '10 Insoportable']}
            error={intento && dolor == null}
          />
          {errorGuardar ? <Cuerpo color={c.error}>{errorGuardar}</Cuerpo> : null}
          {/* Inactivo pero tocable: si falta un dato, vibra y marca en rojo lo que falta */}
          <Boton display alto={64} cargando={guardando} inactivo={rpe == null || dolor == null} onPress={guardar}>GUARDAR SESIÓN</Boton>
        </ScrollView>
      ) : null}

      {fase === 'cuidado' ? (
        <ScrollView contentContainerStyle={{ paddingBottom: 16, paddingHorizontal: 16, gap: 16 }}>
          <View aria-hidden style={{ height: 14, marginHorizontal: -16, flexDirection: 'row', overflow: 'hidden' }}>
            {Array.from({ length: 40 }, (_, i) => (
              <View key={i} style={{ width: 12, height: 14, backgroundColor: i % 2 ? c.asfalto : c.senal }} />
            ))}
          </View>
          <Etiqueta tam={13} color={c.senal}>{`DOLOR ${dolor}/10 · CUIDÉMONOS`}</Etiqueta>
          <Titulo tam={52}>{'Hoy, a bajar\nel ritmo.'}</Titulo>
          <Cuerpo tam={17}>{`Un dolor de ${dolor}/10 es una señal para frenar, no para aguantar. Guardamos tu sesión. ${resultado?.mensaje ?? ''}`}</Cuerpo>
          {movilidad.length ? (
            <View style={{ backgroundColor: c.concreto, borderWidth: 1, borderColor: c.grafito, borderRadius: 4, padding: 14 }}>
              <Titulo tam={22} style={{ marginBottom: 6 }}>{`Movilidad suave · ${movilidad.length * 2} min`}</Titulo>
              {movilidad.map((e, i) => (
                <Pressable
                  key={e.id}
                  onPress={() => router.push({ pathname: '/ejercicio/[id]', params: { id: String(e.id) } })}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, borderTopWidth: 1, borderTopColor: c.grafito }}
                >
                  <Titulo tam={22} color={c.exito} style={{ width: 30 }}>{`0${i + 1}`}</Titulo>
                  <Cuerpo peso="semi" style={{ flex: 1, minWidth: 0 }}>{e.nombre}</Cuerpo>
                  <Etiqueta tam={14}>2 min</Etiqueta>
                </Pressable>
              ))}
            </View>
          ) : null}
          <Boton alto={64} tam={18} onPress={() => router.replace({ pathname: '/entreno', params: { lumbar: '1' } })}>Hacer movilidad ahora</Boton>
          <View style={{ padding: 12, borderWidth: 1, borderColor: c.advertencia, borderRadius: 4 }}>
            <Cuerpo tam={14} color={c.niebla}>Si el dolor sigue más de 48 horas, baja por la pierna o sientes hormigueo, consulta a un profesional de la salud.</Cuerpo>
          </View>
          <Boton variante="secundario" onPress={() => router.dismissTo('/')}>Ir a Hoy</Boton>
        </ScrollView>
      ) : null}

      {fase === 'ok' ? (
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', gap: 18, paddingHorizontal: 16, paddingBottom: 16 }}>
          <View style={{ width: 84, height: 84, backgroundColor: c.voltaje, borderRadius: 4, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-7deg' }] }}>
            <Icono nombre="check" tam={44} grosor={3} color={c.asfalto} />
          </View>
          <Titulo tam={72}>
            {'¡Sesión\n'}
            <Titulo tam={72} color={c.voltaje}>lista!</Titulo>
          </Titulo>
          <View style={{ borderWidth: 1, borderColor: c.grafito, borderRadius: 4, overflow: 'hidden', backgroundColor: c.grafito, gap: 1 }}>
            {[
              [[mmss(transcurrido), 'TIEMPO', c.hueso], [String(hechas), 'SERIES', c.hueso]],
              [[`${rpe}/10`, 'ESFUERZO', c.hueso], [`${dolor}/10`, 'DOLOR', c.exito]],
            ].map((fila, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 1 }}>
                {fila.map(([v, l, col]) => (
                  <View key={l} style={{ flex: 1, minWidth: 0, backgroundColor: c.concreto, padding: 14 }}>
                    <Metrica tam={30} color={col}>{v}</Metrica>
                    <Etiqueta tam={12}>{l}</Etiqueta>
                  </View>
                ))}
              </View>
            ))}
          </View>
          <Cuerpo tam={17}>
            Vas <Cuerpo tam={17} peso="negrita">{`${plan.hechasSemana + 1} de ${plan.meta}`}</Cuerpo> esta semana. ¡Así es!
          </Cuerpo>
          <Boton display alto={64} onPress={() => router.dismissTo('/')}>LISTO</Boton>
        </ScrollView>
      ) : null}

      {pausado ? (
        <View
          accessibilityViewIsModal
          accessibilityLabel="Pausa"
          style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(11,11,12,.94)', paddingHorizontal: 16, paddingTop: ins.top + 16, paddingBottom: ins.bottom + 16, gap: 10 }}
        >
          <View style={{ flex: 1, justifyContent: 'center', gap: 8 }}>
            <Etiqueta tam={14}>{`PAUSA · ${mmss(transcurrido)}`}</Etiqueta>
            <Titulo tam={72}>{'Tómate\ntu tiempo.'}</Titulo>
          </View>
          <Boton display alto={72} tam={32} onPress={reanudar}>REANUDAR</Boton>
          <Boton variante="secundario" onPress={terminar}>Terminar y evaluar</Boton>
          <Pressable onPress={() => router.back()} style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center' }}>
            <Cuerpo peso="negrita" color={c.error}>Salir sin guardar</Cuerpo>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function Escala({
  titulo, valores, columnas, valor, onElegir, texto, color, extremos, error,
}: {
  titulo: string;
  valores: number[];
  columnas: number;
  valor: number | null;
  onElegir: (n: number) => void;
  texto: string;
  color: (n: number) => string;
  extremos: [string, string];
  error: boolean;
}) {
  const filas: number[][] = [];
  for (let i = 0; i < valores.length; i += columnas) filas.push(valores.slice(i, i + columnas));
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <Titulo tam={26}>{titulo}</Titulo>
        <Cuerpo tam={15} peso="negrita" color={valor == null ? (error ? c.error : c.niebla) : color(valor)}>{texto}</Cuerpo>
      </View>
      {filas.map((fila, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 6 }}>
          {fila.map((n) => {
            const on = valor === n;
            return (
              <Pressable
                key={n}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${titulo} ${n}`}
                onPress={() => {
                  vib.toque();
                  onElegir(n);
                }}
                style={({ pressed }) => ({
                  flexGrow: 1, flexBasis: 0, minWidth: 0, minHeight: 60, borderRadius: 4, borderWidth: 2,
                  borderColor: on ? color(n) : error ? c.error : c.grafito, backgroundColor: on ? color(n) : c.concreto,
                  alignItems: 'center', justifyContent: 'center', transform: [{ translateY: pressed ? 2 : 0 }],
                })}
              >
                <Text maxFontSizeMultiplier={MAX_ESCALA} style={{ fontFamily: F.monoNegrita, fontSize: 24, color: on ? c.asfalto : c.hueso }}>{n}</Text>
              </Pressable>
            );
          })}
          {Array.from({ length: columnas - fila.length }, (_, k) => (
            <View key={`v${k}`} style={{ flexGrow: 1, flexBasis: 0, minWidth: 0 }} />
          ))}
        </View>
      ))}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Cuerpo tam={13} color={c.niebla}>{extremos[0]}</Cuerpo>
        <Cuerpo tam={13} color={c.niebla}>{extremos[1]}</Cuerpo>
      </View>
    </View>
  );
}
