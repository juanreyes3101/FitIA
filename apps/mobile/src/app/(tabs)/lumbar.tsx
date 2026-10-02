import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { TIPOS_EJERCICIO, type Ejercicio, type TipoEjercicio } from '@fitia/shared';
import { api } from '@/api';
import { useSesion } from '@/sesion/SesionContext';
import { useDatos } from '@/hooks/useDatos';
import { SEG_RAPIDA, rapidaLumbar } from '@/lib/lumbar';
import * as vib from '@/lib/vibracion';
import { F, c } from '@/tema';
import { Pantalla } from '@/ui/Pantalla';
import { Boton } from '@/ui/Boton';
import { Interruptor, Sello } from '@/ui/Controles';
import { Cargando, ErrorEstado, Vacio } from '@/ui/Estados';
import { Icono, Play } from '@/ui/Iconos';
import { Cuerpo, Etiqueta, Titulo } from '@/ui/Texto';

const TIPOS: ('TODOS' | TipoEjercicio)[] = ['TODOS', 'MOVILIDAD', 'ESTIRAMIENTO', 'CORE', 'FUERZA', 'CARDIO'];
const SEVERIDAD = ['', 'LEVE', 'MODERADA', 'FUERTE'];
/** Abreviaturas para la miniatura de 64 px (las mismas de la web) */
const CORTO: Record<TipoEjercicio, string> = { CARDIO: 'CAR', CORE: 'CORE', FUERZA: 'FZA', MOVILIDAD: 'MOV', ESTIRAMIENTO: 'EST' };

export default function Lumbar() {
  const { perfil } = useSesion();
  const cargar = useCallback(
    () => Promise.all([api.ejercicios.listar({ lumbar: true }), api.ejercicios.seguros()]) as Promise<[Ejercicio[], Ejercicio[]]>,
    [],
  );
  const { datos, cargando, refrescando, error, recargar } = useDatos(cargar);
  const [tipo, setTipo] = useState<'TODOS' | TipoEjercicio>('TODOS');
  const [solo, setSolo] = useState(false);
  const seguros = useMemo(() => new Set((datos?.[1] ?? []).map((e) => e.id)), [datos]);
  const lumbar = perfil?.condiciones.find((x) => x.codigo === 'DOLOR_LUMBAR');

  if (cargando) return <Pantalla><Cargando texto="Cargando ejercicios…" /></Pantalla>;
  if (!datos) return <Pantalla><ErrorEstado error={error} onReintentar={recargar} /></Pantalla>;

  const todos = datos[0];
  const lista = todos.filter((e) => (tipo === 'TODOS' || e.tipo === tipo) && (!solo || seguros.has(e.id)));
  const rapida = rapidaLumbar(todos);
  // Minutos de trabajo (5 × 2 min); los descansos de 15 s entre ejercicios van aparte
  const minutos = Math.round((rapida.length * SEG_RAPIDA) / 60);

  return (
    <Pantalla onRefrescar={recargar} refrescando={refrescando}>
      <View>
        <Etiqueta color={c.exito}>{lumbar ? `MOLESTIA LUMBAR · ${SEVERIDAD[lumbar.severidad]}` : 'ESPALDA FUERTE'}</Etiqueta>
        <Titulo tam={44} style={{ marginTop: 4 }}>Cuida tu espalda</Titulo>
      </View>

      {rapida.length ? (
        <View style={{ overflow: 'hidden', borderRadius: 4, backgroundColor: c.concreto, borderWidth: 2, borderColor: c.exito, padding: 18, gap: 14 }}>
          <Text aria-hidden maxFontSizeMultiplier={1} style={{ position: 'absolute', right: -10, top: -30, fontFamily: F.titulo, fontSize: 170, lineHeight: 180, color: 'rgba(61,220,132,.1)' }}>
            {String(minutos)}
          </Text>
          <Sello bg={c.exito}>RUTINA RÁPIDA</Sello>
          <Titulo tam={44}>{`${minutos} minutos\npara tu espalda`}</Titulo>
          <View>
            {rapida.map((e, i) => (
              <View key={e.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44, borderTopWidth: 1, borderTopColor: c.grafito }}>
                <Titulo tam={20} color={c.exito} style={{ width: 28 }}>{`0${i + 1}`}</Titulo>
                <Cuerpo peso="semi" style={{ flex: 1, minWidth: 0 }}>{e.nombre}</Cuerpo>
                <Etiqueta tam={14}>{`${SEG_RAPIDA / 60}:00`}</Etiqueta>
              </View>
            ))}
          </View>
          <Boton variante="verde" display alto={64} tam={28} icono={<Play tam={22} color={c.asfalto} />} onPress={() => router.push({ pathname: '/entreno', params: { lumbar: '1' } })}>
            {`EMPEZAR · ${minutos} MIN`}
          </Boton>
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 6 }}>
        <Titulo tam={28}>Biblioteca</Titulo>
        <Etiqueta tam={13}>{`${lista.length} DE ${todos.length}`}</Etiqueta>
      </View>
      {/* Carrusel de chips: se desplaza de lado a propósito, de borde a borde */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ gap: 6, paddingHorizontal: 16 }}>
        {TIPOS.map((t) => {
          const on = t === tipo;
          return (
            <Pressable
              key={t}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={() => {
                vib.toque();
                setTipo(t);
              }}
              style={({ pressed }) => ({
                minHeight: 48, paddingHorizontal: 16, justifyContent: 'center', borderRadius: 2, borderWidth: 2,
                borderColor: on ? c.voltaje : c.grafito, backgroundColor: on ? c.voltaje : 'transparent',
                transform: [{ translateY: pressed ? 2 : 0 }],
              })}
            >
              <Cuerpo tam={15} peso="negrita" color={on ? c.asfalto : c.hueso}>{t === 'TODOS' ? 'Todos' : TIPOS_EJERCICIO[t]}</Cuerpo>
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={{ borderWidth: 1, borderColor: c.grafito, borderRadius: 4, backgroundColor: c.concreto }}>
        <Interruptor etiqueta="Solo seguros para mí" detalle="Según tus molestias y tu IMC" valor={solo} onCambio={setSolo} colorOn={c.exito} />
      </View>

      {lista.length === 0 ? (
        <Vacio titulo="Nada por aquí" texto="Ningún ejercicio cumple esos filtros. Prueba con otro tipo." accion="VER TODOS" onAccion={() => { setTipo('TODOS'); setSolo(false); }} />
      ) : (
        <View style={{ gap: 8 }}>
          {lista.map((e) => {
            const seguro = seguros.has(e.id);
            return (
              <Pressable
                key={e.id}
                onPress={() => router.push({ pathname: '/ejercicio/[id]', params: { id: String(e.id) } })}
                accessibilityRole="button"
                style={({ pressed }) => ({
                  flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderWidth: 1, borderColor: c.grafito, borderRadius: 4,
                  backgroundColor: c.concreto, transform: [{ translateY: pressed ? 2 : 0 }],
                })}
              >
                <View style={{ width: 64, height: 64, borderRadius: 2, backgroundColor: c.voltaje, justifyContent: 'flex-end', padding: 4 }}>
                  <Titulo tam={22} color={c.asfalto}>{CORTO[e.tipo]}</Titulo>
                </View>
                <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                  <Cuerpo tam={17} peso="negrita" numberOfLines={2}>{e.nombre}</Cuerpo>
                  <Etiqueta tam={13} style={{ fontFamily: F.mono }}>{`${TIPOS_EJERCICIO[e.tipo]} · ${e.grupo} · ${e.equipo}`}</Etiqueta>
                  <Etiqueta tam={12} color={seguro ? c.exito : c.advertencia}>{seguro ? '✓ SEGURO PARA TU ESPALDA' : 'NO RECOMENDADO HOY'}</Etiqueta>
                </View>
                <Icono nombre="adelante" tam={20} color={c.niebla} />
              </Pressable>
            );
          })}
        </View>
      )}
    </Pantalla>
  );
}
