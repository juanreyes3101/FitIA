// Detalle de ejercicio (docs/diseno/movil/FitiaMovEjercicio). La BD no tiene video, músculos ni
// errores comunes: se muestra un bloque duotono sin reproductor falso, grupo y equipo; el paso a paso
// sale de `instrucciones` y "por qué" de las notas de la rutina o de la revisión de seguridad.
import { useCallback } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TIPOS_EJERCICIO, descanso, dosis, esVerdadero, type Ejercicio, type Rutina } from '@fitia/shared';
import { api } from '@/api';
import { rutinaActivaONula } from '@/lib/datos';
import { useDatos } from '@/hooks/useDatos';
import { F, c } from '@/tema';
import { Boton } from '@/ui/Boton';
import { Sello } from '@/ui/Controles';
import { Cargando, ErrorEstado, Vacio } from '@/ui/Estados';
import { Icono } from '@/ui/Iconos';
import { Cuerpo, Etiqueta, Metrica, Titulo } from '@/ui/Texto';

/** "Paso a paso" a partir del texto de instrucciones (misma regla que la web). */
function pasos(texto: string | null | undefined): string[] {
  if (!texto) return [];
  const frases = texto.split(/(?<=\.)\s+/).filter(Boolean);
  const base = frases.length > 1 ? frases : texto.split(/,\s+/);
  return base.map((p) => p.trim().replace(/^\w/, (x) => x.toUpperCase()).replace(/[.,]?$/, '.'));
}

export default function EjercicioDetalle() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ins = useSafeAreaInsets();
  const cargar = useCallback(
    () => Promise.all([api.ejercicios.listar(), rutinaActivaONula(), api.ejercicios.seguros()]) as Promise<[Ejercicio[], Rutina | null, Ejercicio[]]>,
    [],
  );
  const { datos, cargando, error, recargar } = useDatos(cargar, [id]);
  const volver = () => (router.canGoBack() ? router.back() : router.replace('/rutina'));

  const botonVolver = (
    <Pressable
      onPress={volver}
      accessibilityRole="button"
      accessibilityLabel="Volver"
      style={{ position: 'absolute', left: 12, top: ins.top + 12, width: 48, height: 48, borderRadius: 4, backgroundColor: c.asfalto, alignItems: 'center', justifyContent: 'center', zIndex: 2 }}
    >
      <Icono nombre="atras" tam={22} color={c.hueso} />
    </Pressable>
  );

  if (cargando || !datos)
    return (
      <View style={{ flex: 1, backgroundColor: c.asfalto, paddingTop: ins.top + 72, paddingHorizontal: 16 }}>
        {botonVolver}
        {cargando ? <Cargando /> : <ErrorEstado error={error} onReintentar={recargar} />}
      </View>
    );

  const [lista, rutina, seguros] = datos;
  const ej = lista.find((e) => e.id === Number(id));
  const dia = rutina?.dias.find((d) => d.ejercicios.some((e) => e.ejercicio_id === Number(id)));
  const enRutina = dia?.ejercicios.find((e) => e.ejercicio_id === Number(id));

  if (!ej)
    return (
      <View style={{ flex: 1, backgroundColor: c.asfalto, paddingTop: ins.top + 72, paddingHorizontal: 16 }}>
        {botonVolver}
        <Vacio titulo="No encontramos este ejercicio" texto="Puede que lo hayamos cambiado en tu nueva rutina." accion="VER BIBLIOTECA" onAccion={() => router.replace('/lumbar')} />
      </View>
    );

  const seguro = seguros.some((e) => e.id === ej.id);
  const espalda = esVerdadero(ej.apto_lumbar);
  const lista_pasos = pasos(ej.instrucciones ?? enRutina?.instrucciones);
  const porque =
    enRutina?.notas ??
    (seguro
      ? espalda
        ? 'Es apto para molestia lumbar: trabaja sin cargar la espalda baja. Por eso pasó los filtros de seguridad para tu perfil.'
        : 'Pasó los filtros de seguridad para tu perfil: no está contraindicado para tus condiciones. Cuida la postura en cada repetición.'
      : 'Hoy no está en tu lista segura por tus molestias o tu IMC. Consúltalo con tu entrenador antes de hacerlo.');

  const celdas: [string, string][] = [
    [enRutina ? dosis(enRutina) : '—', 'DOSIS'],
    [enRutina ? descanso(enRutina) : '—', 'DESCANSO'],
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.asfalto }} contentContainerStyle={{ paddingBottom: ins.bottom + 24 }}>
      {/* Bloque duotono del diseño: sin video en la BD, no se muestra un reproductor falso */}
      <View style={{ height: 300, backgroundColor: c.voltaje, overflow: 'hidden', justifyContent: 'flex-end', padding: 16, paddingTop: ins.top }}>
        <Text aria-hidden maxFontSizeMultiplier={1} style={{ position: 'absolute', right: -10, bottom: -40, fontFamily: F.titulo, fontSize: 200, lineHeight: 220, color: 'rgba(11,11,12,.12)' }}>
          {TIPOS_EJERCICIO[ej.tipo].slice(0, 3).toUpperCase()}
        </Text>
        <Etiqueta tam={12} color={c.asfalto}>VIDEO PRÓXIMAMENTE</Etiqueta>
      </View>
      {botonVolver}

      <View style={{ padding: 16, gap: 18 }}>
        <View>
          <Etiqueta color={c.voltaje}>{`${TIPOS_EJERCICIO[ej.tipo].toUpperCase()} · ${dia ? `DÍA ${dia.dia_numero}` : 'BIBLIOTECA'}`}</Etiqueta>
          <Titulo tam={46} lineas={3} style={{ marginTop: 6 }}>{ej.nombre}</Titulo>
          <View style={{ marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {espalda ? <Sello bg="rgba(61,220,132,.14)" color={c.exito}>✓ SEGURO PARA TU ESPALDA</Sello> : <Sello borde={c.advertencia} color={c.advertencia}>CUIDA LA POSTURA</Sello>}
            {!seguro ? <Sello borde={c.senal} color={c.senal}>NO RECOMENDADO HOY</Sello> : null}
          </View>
        </View>

        <View style={{ flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: c.grafito }}>
          {celdas.map(([v, l], i) => (
            <View key={l} style={{ flex: 1, minWidth: 0, paddingVertical: 12, paddingLeft: i ? 10 : 0, borderLeftWidth: i ? 1 : 0, borderColor: c.grafito }}>
              <Metrica tam={20}>{v}</Metrica>
              <Etiqueta tam={12}>{l}</Etiqueta>
            </View>
          ))}
          <View style={{ flex: 1, minWidth: 0, paddingVertical: 12, paddingLeft: 10, borderLeftWidth: 1, borderColor: c.grafito }}>
            <Cuerpo tam={15} peso="negrita">{ej.equipo || 'Sin equipo'}</Cuerpo>
            <Etiqueta tam={12}>EQUIPO</Etiqueta>
          </View>
        </View>

        {/* Sombra "bloque" 5 5 0 Voltaje del diseño: un bloque desplazado detrás de la tarjeta */}
        <View style={{ paddingRight: 5, paddingBottom: 5 }}>
          <View aria-hidden style={{ position: 'absolute', left: 5, top: 5, right: 0, bottom: 0, backgroundColor: c.voltaje, borderRadius: 4 }} />
          <View style={{ backgroundColor: c.asfalto, borderWidth: 2, borderColor: c.voltaje, borderRadius: 4, padding: 14, gap: 8 }}>
            <Titulo tam={22}>✦ Por qué lo elegimos</Titulo>
            <Cuerpo>{porque}</Cuerpo>
          </View>
        </View>

        {lista_pasos.length ? (
          <View style={{ gap: 4 }}>
            <Titulo tam={26}>Paso a paso</Titulo>
            {lista_pasos.map((t, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 10, alignItems: 'baseline', paddingVertical: 12, borderTopWidth: 1, borderTopColor: c.grafito }}>
                <Titulo tam={32} color={c.voltaje} style={{ width: 44 }}>{`0${i + 1}`}</Titulo>
                <Cuerpo tam={17} style={{ flex: 1, minWidth: 0 }}>{t}</Cuerpo>
              </View>
            ))}
          </View>
        ) : null}

        <View style={{ gap: 10 }}>
          <Titulo tam={26}>Músculos</Titulo>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            <View style={{ minHeight: 36, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 2, backgroundColor: c.voltaje }}>
              <Cuerpo tam={15} peso="negrita" color={c.asfalto}>{ej.grupo}</Cuerpo>
            </View>
          </View>
        </View>

        {dia ? (
          <Boton variante="contorno" onPress={() => router.push({ pathname: '/entreno', params: { dia: String(dia.rutina_dia_id) } })}>
            {`Entrenar el día ${dia.dia_numero}`}
          </Boton>
        ) : null}
      </View>
    </ScrollView>
  );
}
