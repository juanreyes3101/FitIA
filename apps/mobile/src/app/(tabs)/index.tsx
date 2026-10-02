import { useCallback } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import {
  DOW, diaDeHoy, esVerdadero, formatoNumero, minutosDia, racha, seriesDia, sesionesEstaSemana,
  type Perfil, type Progreso, type RespuestaAnuncio, type Rutina,
} from '@fitia/shared';
import { api } from '@/api';
import { iniciales, useSesion } from '@/sesion/SesionContext';
import { usePlanes } from '@/planes/HojaPlanes';
import { rutinaActivaONula, useSesionHoy } from '@/lib/datos';
import { useDatos } from '@/hooks/useDatos';
import { useRecargarAlVolver } from '@/hooks/useRecargarAlVolver';
import { F, MAX_ESCALA, c } from '@/tema';
import { Pantalla } from '@/ui/Pantalla';
import { Boton, Enlace } from '@/ui/Boton';
import { Sello, Tarjeta } from '@/ui/Controles';
import { Cargando, ErrorEstado, Vacio } from '@/ui/Estados';
import { Icono, Play, type NombreIcono } from '@/ui/Iconos';
import { MedidorImc, colorClase, etiquetaClase } from '@/ui/MedidorImc';
import { Cuerpo, Etiqueta, Metrica, Titulo } from '@/ui/Texto';

const MESES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
const fechaHoy = () => {
  const d = new Date();
  return `${DOW[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]}`;
};

interface DatosHoy {
  rutina: Rutina | null;
  progreso: Progreso;
  anuncio: RespuestaAnuncio | null;
}

export default function Hoy() {
  const { perfil, recargarPerfil } = useSesion();
  const conPublicidad = esVerdadero(perfil?.plan?.con_publicidad);
  const cargar = useCallback(async (): Promise<DatosHoy> => {
    const [rutina, progreso, anuncio] = await Promise.all([
      rutinaActivaONula(),
      api.progreso(60),
      // La publicidad solo existe en el plan Free: en Pro ni se pide
      conPublicidad ? api.anuncios('BANNER_HOME').catch(() => null) : Promise.resolve(null),
    ]);
    return { rutina, progreso, anuncio };
  }, [conPublicidad]);
  const { datos, cargando, refrescando, error, recargar } = useDatos(cargar, [conPublicidad]);
  const refrescar = useCallback(() => {
    recargar();
    void recargarPerfil();
  }, [recargar, recargarPerfil]);
  useRecargarAlVolver(refrescar);

  const nombre = (perfil?.nombre ?? '').split(/\s+/)[0] || 'parce';

  return (
    <Pantalla gap={12} onRefrescar={refrescar} refrescando={refrescando}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, paddingTop: 4, paddingBottom: 6 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Etiqueta tam={13}>{fechaHoy()}</Etiqueta>
          <Titulo tam={44} lineas={2} style={{ marginTop: 4 }}>{`Hola, ${nombre}`}</Titulo>
        </View>
        <Pressable
          onPress={() => router.navigate('/perfil')}
          accessibilityRole="button"
          accessibilityLabel="Perfil"
          style={({ pressed }) => ({
            width: 48, height: 48, borderRadius: 4, backgroundColor: c.hueso, alignItems: 'center', justifyContent: 'center',
            transform: [{ translateY: pressed ? 2 : 0 }],
          })}
        >
          <Titulo tam={20} color={c.asfalto}>{iniciales(perfil?.nombre)}</Titulo>
        </Pressable>
      </View>

      {perfil && !perfil.perfil ? (
        <Vacio
          titulo="Arma tu perfil"
          texto="Cuéntanos tu peso, tu objetivo y si algo te molesta. Con eso la IA arma una rutina segura para ti."
          accion="EMPEZAR"
          onAccion={() => router.push('/onboarding')}
        />
      ) : cargando ? (
        <Cargando texto="Cargando tu día…" />
      ) : !datos ? (
        <ErrorEstado error={error} onReintentar={refrescar} />
      ) : (
        <Contenido datos={datos} perfil={perfil} />
      )}
    </Pantalla>
  );
}

function Contenido({ datos, perfil }: { datos: DatosHoy; perfil: Perfil | null }) {
  const { abrirPlanes } = usePlanes();
  const sesionHoy = useSesionHoy();
  const { rutina, progreso, anuncio } = datos;
  const adh = progreso.adherencia_semanal;
  const hechas = sesionesEstaSemana(adh);
  const meta = perfil?.perfil?.dias_disponibles ?? rutina?.dias.length ?? 3;
  const semanas = racha(adh);
  const m = perfil?.medicion_actual;
  const cupo = perfil?.cupo_ia_restante ?? 0;
  const cupoMax = perfil?.plan?.rutinas_ia_mes ?? 2;
  const lumbar = !!perfil?.condiciones.some((x) => x.codigo === 'DOLOR_LUMBAR');
  // Si ya entrenó hoy, la sesión ya cuenta en la semana: el "día de hoy" es el que acaba de hacer
  const hoy = rutina ? diaDeHoy(rutina, Math.max(0, hechas - (sesionHoy ? 1 : 0))) : undefined;

  const resumen: { l: string; v: string; vc: string; ic: string; icono: NombreIcono; ir: () => void }[] = [
    {
      l: 'Peso actual',
      v: m?.peso_kg ? `${formatoNumero(Number(m.peso_kg))} kg` : '—',
      vc: c.exito,
      ic: c.hueso,
      icono: 'progreso',
      ir: () => router.navigate('/progreso'),
    },
    {
      l: cupo === 1 ? 'Te queda 1 rutina IA' : cupo === 0 ? 'Sin rutinas IA este mes' : `Te quedan ${cupo} rutinas IA`,
      v: `${cupo}/${cupoMax}`,
      vc: cupo <= 1 ? c.advertencia : c.hueso,
      ic: c.advertencia,
      icono: 'ia',
      ir: abrirPlanes,
    },
    { l: 'Espalda en 10 min', v: '›', vc: c.niebla, ic: c.exito, icono: 'lumbar', ir: () => router.navigate('/lumbar') },
  ];

  return (
    <>
      {!rutina || !hoy ? (
        <Vacio
          titulo="Aún no tienes rutina"
          texto="Pídele a la IA una rutina hecha para tu cuerpo y tus molestias. Revisamos que todo sea seguro antes de mostrártela."
          accion="ARMAR MI RUTINA"
          onAccion={() => router.navigate('/rutina')}
        />
      ) : (
        <View style={{ overflow: 'hidden', borderRadius: 4, backgroundColor: c.voltaje, paddingTop: 20, paddingHorizontal: 18, paddingBottom: 18, gap: 14 }}>
          {/* Número gigante de fondo: el padre recorta (overflow hidden), no crea scroll horizontal */}
          <Text
            aria-hidden
            maxFontSizeMultiplier={1}
            style={{ position: 'absolute', right: -14, top: -34, fontFamily: F.titulo, fontSize: 200, lineHeight: 210, color: 'rgba(11,11,12,.09)' }}
          >
            {String(hoy.dia_numero).padStart(2, '0')}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            <Sello bg={c.asfalto} color={c.voltaje}>{sesionHoy ? 'ENTRENO DE HOY · HECHO' : 'ENTRENO DE HOY'}</Sello>
            {lumbar ? <Sello borde={c.asfalto}>✓ CUIDA TU ESPALDA</Sello> : null}
          </View>
          <Titulo tam={52} color={c.asfalto} lineas={3}>{`Día ${hoy.dia_numero}\n${hoy.enfoque}`}</Titulo>
          <View style={{ flexDirection: 'row', borderTopWidth: 2, borderBottomWidth: 2, borderColor: c.asfalto }}>
            {[
              [minutosDia(hoy), 'MIN'],
              [hoy.ejercicios.length, 'EJERCICIOS'],
              [seriesDia(hoy), 'SERIES'],
            ].map(([n, l], i) => (
              <View key={l} style={{ flex: 1, minWidth: 0, paddingVertical: 10, paddingLeft: i ? 10 : 0, borderLeftWidth: i ? 2 : 0, borderColor: c.asfalto }}>
                <Metrica tam={28} color={c.asfalto}>{String(n)}</Metrica>
                <Etiqueta tam={12} color={c.asfalto} numberOfLines={1}>{String(l)}</Etiqueta>
              </View>
            ))}
          </View>
          {sesionHoy ? (
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', padding: 14, backgroundColor: c.asfalto, borderRadius: 4 }}>
              <Icono nombre="check" tam={30} grosor={3} color={c.exito} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Cuerpo peso="negrita">¡Hoy ya cumpliste!</Cuerpo>
                <Cuerpo tam={15} color={c.niebla}>{`Esfuerzo ${sesionHoy.rpe}/10 · dolor ${sesionHoy.dolor}/10`}</Cuerpo>
              </View>
            </View>
          ) : (
            <>
              <Boton variante="oscuro" alto={72} display tam={36} icono={<Play tam={28} color={c.voltaje} />} onPress={() => router.push({ pathname: '/entreno', params: { dia: String(hoy.rutina_dia_id) } })}>
                EMPEZAR
              </Boton>
              <Enlace color={c.asfalto} onPress={() => router.navigate('/rutina')}>{`Ver los ${hoy.ejercicios.length} ejercicios`}</Enlace>
            </>
          )}
        </View>
      )}

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Tarjeta style={{ flex: 1, minWidth: 0 }}>
          <Etiqueta>RACHA</Etiqueta>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
            <Metrica tam={56} color={c.voltaje} style={{ flexShrink: 0 }}>{String(semanas)}</Metrica>
            <Titulo tam={18} lineas={1}>{semanas === 1 ? 'SEMANA' : 'SEMANAS'}</Titulo>
          </View>
          {/* Meta de la semana: la API cuenta sesiones por semana, no por día (no se inventan días) */}
          <View accessibilityLabel={`${hechas} de ${meta} sesiones esta semana`} style={{ flexDirection: 'row', gap: 3 }}>
            {Array.from({ length: Math.max(meta, 1) }, (_, i) => (
              <View
                key={i}
                style={{
                  flex: 1, minWidth: 0, aspectRatio: 1, maxHeight: 22, borderRadius: 2, borderWidth: 2,
                  borderStyle: i < hechas ? 'solid' : 'dashed',
                  borderColor: i < hechas ? c.voltaje : i === hechas ? c.voltaje : c.niebla,
                  backgroundColor: i < hechas ? c.voltaje : 'transparent',
                }}
              />
            ))}
          </View>
          <Etiqueta tam={11}>{`${hechas}/${meta} ESTA SEMANA`}</Etiqueta>
        </Tarjeta>

        <Pressable
          onPress={() => router.push('/imc')}
          accessibilityRole="button"
          accessibilityLabel="Calculadora IMC"
          style={({ pressed }) => ({ flex: 1, minWidth: 0, transform: [{ translateY: pressed ? 2 : 0 }] })}
        >
          <Tarjeta style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Etiqueta>IMC</Etiqueta>
              <Etiqueta>›</Etiqueta>
            </View>
            <Metrica tam={38} color={c.voltaje}>{m?.imc ? formatoNumero(Number(m.imc), 2) : '--,--'}</Metrica>
            <MedidorImc imc={m?.imc ? Number(m.imc) : null} clase={m?.clasificacion_imc ?? null} alto={8} marcador={false} />
            <Sello bg={colorClase(m?.clasificacion_imc)}>{etiquetaClase(m?.clasificacion_imc)}</Sello>
          </Tarjeta>
        </Pressable>
      </View>

      <Tarjeta style={{ gap: 2 }}>
        <Etiqueta style={{ marginBottom: 6 }}>RESUMEN</Etiqueta>
        {resumen.map((x) => (
          <Pressable
            key={x.l}
            onPress={x.ir}
            accessibilityRole="button"
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, borderTopWidth: 1, borderTopColor: c.grafito, opacity: pressed ? 0.7 : 1 })}
          >
            <View style={{ width: 40, height: 40, borderWidth: 2, borderColor: x.ic, borderRadius: 4, alignItems: 'center', justifyContent: 'center' }}>
              <Icono nombre={x.icono} tam={20} color={x.ic} />
            </View>
            <Cuerpo peso="semi" style={{ flex: 1, minWidth: 0 }} numberOfLines={2}>{x.l}</Cuerpo>
            <Text maxFontSizeMultiplier={MAX_ESCALA} style={{ fontFamily: F.monoNegrita, fontSize: 17, color: x.vc }}>{x.v}</Text>
          </Pressable>
        ))}
      </Tarjeta>

      {anuncio?.anuncio ? (
        <View accessibilityLabel="Publicidad" style={{ backgroundColor: c.hueso, borderRadius: 4, paddingTop: 22, paddingHorizontal: 14, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Etiqueta tam={10} color={c.humo} style={{ position: 'absolute', left: 10, top: 6 }}>PUBLICIDAD</Etiqueta>
          <Pressable
            style={{ flex: 1, minWidth: 0 }}
            disabled={!anuncio.anuncio.destino_url}
            onPress={() => anuncio.anuncio?.destino_url && Linking.openURL(anuncio.anuncio.destino_url).catch(() => {})}
          >
            <Cuerpo tam={14} color={c.asfalto}>
              <Cuerpo tam={14} peso="negrita" color={c.asfalto}>{anuncio.anuncio.anunciante}</Cuerpo>
              {` · ${anuncio.anuncio.titulo}`}
            </Cuerpo>
          </Pressable>
          <Pressable onPress={abrirPlanes} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 }}>
            <Cuerpo tam={13} peso="negrita" color={c.asfalto} style={{ textDecorationLine: 'underline' }}>Sin anuncios</Cuerpo>
          </Pressable>
        </View>
      ) : null}
    </>
  );
}
