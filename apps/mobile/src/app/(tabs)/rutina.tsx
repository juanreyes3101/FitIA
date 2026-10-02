import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ApiError, descanso, diaDeHoy, dosis, esVerdadero, fechaCorta, minutosDia, sesionesEstaSemana,
  type Rutina, type RutinaGenerada,
} from '@fitia/shared';
import { api } from '@/api';
import { useSesion } from '@/sesion/SesionContext';
import { usePlanes } from '@/planes/HojaPlanes';
import { rutinaActivaONula, useSesionHoy } from '@/lib/datos';
import { useDatos } from '@/hooks/useDatos';
import { useRecargarAlVolver } from '@/hooks/useRecargarAlVolver';
import * as vib from '@/lib/vibracion';
import { F, c } from '@/tema';
import { Boton } from '@/ui/Boton';
import { Cargando, ErrorEstado, Vacio, mensajeError } from '@/ui/Estados';
import { Icono, Play } from '@/ui/Iconos';
import { useToast } from '@/ui/Toast';
import { Cuerpo, Etiqueta, Titulo } from '@/ui/Texto';

interface DatosRutina {
  rutina: Rutina | RutinaGenerada | null;
  hechas: number;
}

function origen(r: Rutina | RutinaGenerada): string {
  if ('proveedor' in r && r.proveedor === 'mock') return 'RUTINA BASE SEGURA · POR REGLAS';
  if ('desde_cache' in r && r.desde_cache) return `GENERADA POR IA · DESDE CACHÉ`;
  if (r.origen === 'ENTRENADOR') return `AJUSTADA POR TU ENTRENADOR · ${fechaCorta(r.creada_en).toUpperCase()}`;
  return `${r.origen === 'IA' ? 'GENERADA POR IA' : 'PLANTILLA SEGURA'} · ${fechaCorta(r.creada_en).toUpperCase()}`;
}

/** Ícono de IA que gira mientras la IA arma la rutina */
function IconoIa({ girando, color }: { girando: boolean; color: string }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!girando) return;
    const a = Animated.loop(Animated.timing(v, { toValue: 1, duration: 800, easing: Easing.linear, useNativeDriver: true }));
    a.start();
    return () => {
      a.stop();
      v.setValue(0);
    };
  }, [girando, v]);
  return (
    <Animated.View style={{ transform: [{ rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}>
      <Icono nombre="ia" tam={26} color={color} />
    </Animated.View>
  );
}

export default function RutinaPantalla() {
  const ins = useSafeAreaInsets();
  const { perfil, recargarPerfil } = useSesion();
  const { abrirPlanes } = usePlanes();
  const avisar = useToast();
  const sesionHoy = useSesionHoy();
  const cargar = useCallback(async (): Promise<DatosRutina> => {
    const [rutina, p] = await Promise.all([rutinaActivaONula(), api.progreso(14)]);
    return { rutina, hechas: sesionesEstaSemana(p.adherencia_semanal) };
  }, []);
  const { datos, cargando, error, recargar, setDatos } = useDatos(cargar);
  useRecargarAlVolver(recargar);
  const [sel, setSel] = useState<number | null>(null);
  const [generando, setGenerando] = useState(false);

  const cupo = perfil?.cupo_ia_restante ?? 0;
  const puede = cupo > 0;

  async function generar() {
    if (generando) return;
    if (!puede) {
      abrirPlanes();
      return;
    }
    setGenerando(true);
    try {
      const r = await api.rutinas.generar();
      setDatos({ rutina: r, hechas: datos?.hechas ?? 0 });
      setSel(null);
      vib.finDescanso();
      avisar(
        r.proveedor === 'mock' ? 'ok' : 'ia',
        'Rutina nueva lista',
        r.proveedor === 'mock' ? 'Rutina base segura, armada por reglas.' : 'Revisada por el validador de seguridad.',
      );
      await recargarPerfil();
    } catch (e) {
      vib.error();
      if (e instanceof ApiError && e.codigo === 'CUPO_IA_AGOTADO') {
        avisar('warn', 'Sin rutinas IA este mes', 'Con Pro tienes 10 al mes.');
        abrirPlanes();
      } else avisar('err', 'No se pudo generar', mensajeError(e));
    } finally {
      setGenerando(false);
    }
  }

  if (cargando)
    return (
      <View style={{ flex: 1, paddingTop: ins.top, backgroundColor: c.asfalto }}>
        <Cargando texto="Cargando tu rutina…" />
      </View>
    );
  if (!datos)
    return (
      <View style={{ flex: 1, paddingTop: ins.top + 12, paddingHorizontal: 16, backgroundColor: c.asfalto }}>
        <ErrorEstado error={error} onReintentar={recargar} />
      </View>
    );

  const { rutina, hechas } = datos;
  const hoy = rutina ? diaDeHoy(rutina, Math.max(0, hechas - (sesionHoy ? 1 : 0))) : undefined;
  const dia = rutina ? (rutina.dias.find((d) => d.rutina_dia_id === sel) ?? hoy ?? rutina.dias[0]) : undefined;
  const genColor = puede ? c.voltaje : c.humo;
  const genBorde = puede ? c.voltaje : c.grafito;
  const textoCupo = puede
    ? cupo === 1 ? 'Te queda 1 rutina IA este mes' : `Te quedan ${cupo} rutinas IA este mes`
    : 'Se recargan el 1 del próximo mes';

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.asfalto, overflow: 'hidden' }} stickyHeaderIndices={rutina ? [1] : undefined} contentContainerStyle={{ paddingBottom: 16 }}>
      <View style={{ paddingTop: ins.top + 12, paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          {rutina ? <Etiqueta color={c.voltaje} numberOfLines={2}>{origen(rutina)}</Etiqueta> : null}
          <Titulo tam={44} style={{ marginTop: 4 }}>Mi rutina</Titulo>
        </View>
        <Pressable
          onPress={generar}
          accessibilityRole="button"
          accessibilityLabel="Generar nueva rutina con IA"
          style={({ pressed }) => ({
            width: 56, height: 56, borderWidth: 2, borderColor: genBorde, borderRadius: 4, alignItems: 'center', justifyContent: 'center',
            transform: [{ translateY: pressed ? 2 : 0 }],
          })}
        >
          <IconoIa girando={generando} color={genColor} />
        </Pressable>
      </View>

      {rutina && dia ? (
        <View style={{ backgroundColor: c.asfalto, borderBottomWidth: 1, borderBottomColor: c.grafito }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingBottom: 12 }} accessibilityRole="tablist">
            {rutina.dias.map((d) => {
              const on = d.rutina_dia_id === dia.rutina_dia_id;
              const esHoy = d.rutina_dia_id === hoy?.rutina_dia_id;
              return (
                <Pressable
                  key={d.rutina_dia_id}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: on }}
                  onPress={() => {
                    vib.toque();
                    setSel(d.rutina_dia_id);
                  }}
                  style={({ pressed }) => ({
                    minWidth: 132, minHeight: 76, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 4, borderWidth: 2,
                    borderColor: on || esHoy ? c.voltaje : c.grafito, backgroundColor: on ? c.voltaje : c.concreto,
                    justifyContent: 'space-between', transform: [{ translateY: pressed ? 2 : 0 }],
                  })}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                    <Etiqueta color={on ? c.asfalto : c.hueso}>{`${minutosDia(d)}′`}</Etiqueta>
                    <Etiqueta color={on ? c.asfalto : c.voltaje}>{esHoy ? (sesionHoy ? '✓ HOY' : 'HOY') : ''}</Etiqueta>
                  </View>
                  <Titulo tam={26} color={on ? c.asfalto : c.hueso}>{`Día ${d.dia_numero}`}</Titulo>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {!rutina || !dia ? (
        <View style={{ padding: 16, gap: 12 }}>
          <Vacio
            titulo="Aún no tienes rutina"
            texto={
              perfil?.perfil
                ? 'Pídele a la IA una rutina para tu cuerpo. El validador de seguridad la revisa antes de mostrártela.'
                : 'Primero cuéntanos de ti: peso, objetivo y molestias.'
            }
            accion={perfil?.perfil ? (puede ? 'GENERAR CON IA' : 'VER PLANES') : 'ARMAR MI PERFIL'}
            onAccion={perfil?.perfil ? generar : () => router.push('/onboarding')}
          />
          {perfil?.perfil ? <Etiqueta tam={13} style={{ textAlign: 'center' }}>{textoCupo.toUpperCase()}</Etiqueta> : null}
        </View>
      ) : (
        <>
          <View style={{ paddingTop: 16, paddingHorizontal: 16, paddingBottom: 8, gap: 6 }}>
            <Titulo tam={32} lineas={2}>{dia.enfoque}</Titulo>
            <Etiqueta tam={14} style={{ fontFamily: F.mono }}>
              {`${minutosDia(dia)} MIN · ${dia.ejercicios.length} EJERCICIOS · ${dia.ejercicios.filter((e) => e.apto_lumbar).length} ✓ ESPALDA`}
            </Etiqueta>
          </View>

          {dia.ejercicios.map((e, i) => (
            <Pressable
              key={e.rutina_ejercicio_id}
              onPress={() => router.push({ pathname: '/ejercicio/[id]', params: { id: String(e.ejercicio_id) } })}
              accessibilityRole="button"
              style={({ pressed }) => ({
                flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, paddingHorizontal: 16,
                borderBottomWidth: 1, borderBottomColor: c.grafito, backgroundColor: pressed ? c.concreto : 'transparent',
              })}
            >
              {/* Miniatura duotono del diseño: sin fotos en la BD, queda el bloque Voltaje con el número */}
              <View style={{ width: 76, height: 76, borderRadius: 4, overflow: 'hidden', backgroundColor: c.voltaje, justifyContent: 'flex-end', paddingLeft: 4 }}>
                <Text maxFontSizeMultiplier={1} style={{ fontFamily: F.titulo, fontSize: 26, lineHeight: 30, color: c.asfalto }}>{String(i + 1).padStart(2, '0')}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                <Cuerpo tam={18} peso="negrita" numberOfLines={2}>{e.nombre}</Cuerpo>
                <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: F.monoNegrita, fontSize: 16, color: c.voltaje }}>{dosis(e)}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  <Cuerpo tam={13} color={c.niebla}>{`Descanso ${descanso(e)}`}</Cuerpo>
                  {e.apto_lumbar ? (
                    <Cuerpo tam={13} peso="negrita" color={c.exito}>✓ Espalda</Cuerpo>
                  ) : (
                    <Cuerpo tam={13} peso="negrita" color={c.advertencia}>Cuida la postura</Cuerpo>
                  )}
                </View>
              </View>
              <Icono nombre="adelante" tam={20} color={c.niebla} />
            </Pressable>
          ))}

          <View style={{ padding: 16, gap: 10 }}>
            <Boton display alto={64} tam={28} icono={<Play tam={24} color={c.asfalto} />} onPress={() => router.push({ pathname: '/entreno', params: { dia: String(dia.rutina_dia_id) } })}>
              {`EMPEZAR DÍA ${dia.dia_numero}`}
            </Boton>
            {rutina.observaciones_validacion || ('explicacion' in rutina && rutina.explicacion) ? (
              <View style={{ borderWidth: 2, borderColor: c.voltaje, borderRadius: 4, padding: 14, gap: 8, marginVertical: 6 }}>
                <Titulo tam={22}>✦ Por qué esta rutina</Titulo>
                <Cuerpo>{('explicacion' in rutina && rutina.explicacion) || rutina.observaciones_validacion}</Cuerpo>
              </View>
            ) : null}
            <Boton variante="contorno" deshabilitado={!puede && !generando} cargando={generando} onPress={generar}>
              {generando ? 'La IA está armando tu rutina…' : puede ? 'Generar nueva rutina con IA' : 'Sin rutinas IA este mes'}
            </Boton>
            {!puede ? (
              <Boton variante="fantasma" alto={44} onPress={abrirPlanes}>{esVerdadero(perfil?.plan?.con_publicidad) ? 'Pásate a Pro: 10 al mes' : 'Ver mi plan'}</Boton>
            ) : null}
            <Etiqueta tam={13} style={{ textAlign: 'center', fontFamily: F.mono }}>{textoCupo}</Etiqueta>
          </View>
        </>
      )}
    </ScrollView>
  );
}
