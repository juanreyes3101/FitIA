import { useState } from 'react';
import { Pressable, Share, View } from 'react-native';
import { router } from 'expo-router';
import { esVerdadero, fechaCorta, formatoNumero, type CodigoCondicion } from '@fitia/shared';
import { api } from '@/api';
import { iniciales, useSesion } from '@/sesion/SesionContext';
import { usePlanes } from '@/planes/HojaPlanes';
import { rutinaActivaONula } from '@/lib/datos';
import { setVibracion, vibracionActiva } from '@/lib/vibracion';
import { c } from '@/tema';
import { Pantalla } from '@/ui/Pantalla';
import { Boton } from '@/ui/Boton';
import { Interruptor, Rejilla, Tarjeta } from '@/ui/Controles';
import { Cargando, mensajeError } from '@/ui/Estados';
import { Cuerpo, Etiqueta, Metrica, Titulo } from '@/ui/Texto';
import { useToast } from '@/ui/Toast';

type Molestia = CodigoCondicion | 'NINGUNA';
const MOLESTIAS: { valor: Molestia; etiqueta: string }[] = [
  { valor: 'DOLOR_LUMBAR', etiqueta: 'Lumbar' },
  { valor: 'DOLOR_RODILLA', etiqueta: 'Rodilla' },
  { valor: 'HIPERTENSION', etiqueta: 'Hipertensión' },
  { valor: 'NINGUNA', etiqueta: 'Ninguna' },
];

function Fila({ texto, onPress, color = c.hueso, proximamente }: { texto: string; onPress?: () => void; color?: string; proximamente?: boolean }) {
  return (
    <Pressable
      onPress={proximamente ? undefined : onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!proximamente }}
      style={({ pressed }) => ({
        minHeight: 56, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10,
        borderBottomWidth: 1, borderBottomColor: c.grafito, opacity: proximamente ? 0.55 : pressed ? 0.7 : 1,
      })}
    >
      <Cuerpo peso="semi" color={color} style={{ flex: 1, minWidth: 0 }}>{texto}</Cuerpo>
      {proximamente ? <Etiqueta tam={11}>PRÓXIMAMENTE</Etiqueta> : <Etiqueta color={color}>›</Etiqueta>}
    </Pressable>
  );
}

export default function Perfil() {
  const { perfil, usuario, setPerfil, logout } = useSesion();
  const { abrirPlanes } = usePlanes();
  const avisar = useToast();
  const [vibrar, setVibrar] = useState(vibracionActiva());
  const [guardando, setGuardando] = useState(false);
  const [descargando, setDescargando] = useState(false);

  if (!perfil) return <Pantalla><Cargando /></Pantalla>;

  const m = perfil.medicion_actual;
  const plan = perfil.plan;
  const esPro = !!plan && !esVerdadero(plan.con_publicidad);
  const propias = perfil.condiciones.filter((x) => x.origen === 'AUTORREPORTE');
  const marcadas: Molestia[] = propias.length ? propias.map((x) => x.codigo) : ['NINGUNA'];
  const deImc = perfil.condiciones.filter((x) => x.origen === 'IMC');

  async function cambiarMolestia(v: Molestia) {
    const p = perfil?.perfil;
    if (!p) {
      router.push('/onboarding');
      return;
    }
    const actuales = propias.map((x) => x.codigo);
    const nuevas = v === 'NINGUNA' ? [] : actuales.includes(v) ? actuales.filter((x) => x !== v) : [...actuales, v];
    setGuardando(true);
    try {
      // Solo las AUTORREPORTE: las de IMC (sobrepeso y demás) las maneja el trigger de mediciones
      const nuevo = await api.perfil.actualizar({
        nivel_actividad: p.nivel_actividad,
        objetivo: p.objetivo,
        lugar_entreno: p.lugar_entreno,
        dias_disponibles: p.dias_disponibles,
        minutos_por_sesion: p.minutos_por_sesion,
        condiciones: nuevas.map((codigo) => ({ codigo, severidad: (propias.find((x) => x.codigo === codigo)?.severidad ?? 2) as 1 | 2 | 3 })),
      });
      setPerfil(nuevo);
      avisar('ok', 'Molestias actualizadas', 'Tu próxima rutina con IA las tendrá en cuenta.');
    } catch (e) {
      avisar('err', 'No se pudo guardar', mensajeError(e));
    } finally {
      setGuardando(false);
    }
  }

  // Ley 1581: descargar los datos. Se arma con los endpoints que ya existen y se comparte
  // con la hoja nativa del celular (WhatsApp, correo, Drive…): sin librerías extra.
  async function descargar() {
    setDescargando(true);
    try {
      const [perf, rutina, progreso] = await Promise.all([api.perfil.obtener(), rutinaActivaONula(), api.progreso(730)]);
      const json = JSON.stringify({ generado_en: new Date().toISOString(), fuente: 'FitIA', perfil: perf, rutina_activa: rutina, progreso }, null, 2);
      await Share.share({ title: 'fitia-mis-datos.json', message: json });
    } catch (e) {
      avisar('err', 'No se pudo preparar', mensajeError(e));
    } finally {
      setDescargando(false);
    }
  }

  return (
    <Pantalla>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ width: 72, height: 72, borderRadius: 4, backgroundColor: c.hueso, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-7deg' }] }}>
          <Titulo tam={32} color={c.asfalto}>{iniciales(perfil.nombre)}</Titulo>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Titulo tam={36} lineas={2}>{perfil.nombre ?? `${usuario?.nombres ?? ''} ${usuario?.apellidos ?? ''}`}</Titulo>
          <Cuerpo tam={15} color={c.niebla} numberOfLines={1}>{perfil.email ?? usuario?.email}</Cuerpo>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 1, backgroundColor: c.grafito, borderWidth: 1, borderColor: c.grafito, borderRadius: 4, overflow: 'hidden' }}>
        {[
          [m.peso_kg ? formatoNumero(Number(m.peso_kg)) : '—', 'KG', c.hueso],
          [m.estatura_cm ? String(Math.round(Number(m.estatura_cm))) : '—', 'CM', c.hueso],
          [m.imc ? formatoNumero(Number(m.imc), 2) : '—', 'IMC', c.voltaje],
        ].map(([v, l, col]) => (
          <Pressable key={l} onPress={() => router.push('/imc')} style={{ flex: 1, minWidth: 0, backgroundColor: c.concreto, padding: 12 }}>
            <Metrica tam={22} color={col}>{v}</Metrica>
            <Etiqueta tam={12}>{l}</Etiqueta>
          </Pressable>
        ))}
      </View>

      <Pressable
        onPress={abrirPlanes}
        accessibilityRole="button"
        style={({ pressed }) => ({
          minHeight: 72, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 2, borderColor: c.voltaje, borderRadius: 4,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, transform: [{ translateY: pressed ? 2 : 0 }],
        })}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <Titulo tam={24}>{`Plan ${esPro ? 'Pro' : 'Free'}`}</Titulo>
          <Cuerpo tam={14} color={c.niebla}>
            {esPro
              ? `${plan?.rutinas_ia_mes} rutinas IA al mes, sin anuncios${plan?.fecha_fin ? ` · hasta el ${fechaCorta(plan.fecha_fin)}` : ''}`
              : `${perfil.cupo_ia_restante === 1 ? 'Te queda 1 rutina IA' : `Te quedan ${perfil.cupo_ia_restante} rutinas IA`} · con publicidad`}
          </Cuerpo>
        </View>
        <Cuerpo peso="negrita" color={c.voltaje}>{esPro ? 'Gestionar ›' : 'Pro ›'}</Cuerpo>
      </Pressable>

      <Tarjeta style={{ padding: 14, gap: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Titulo tam={22}>Molestias</Titulo>
          {guardando ? <Etiqueta>GUARDANDO…</Etiqueta> : null}
        </View>
        <Rejilla multiple display={false} alto={48} columnas={2} valor={marcadas} onElegir={cambiarMolestia} opciones={MOLESTIAS.map((x) => ({ ...x, etiqueta: (marcadas.includes(x.valor) ? '✓ ' : '') + x.etiqueta }))} />
        {deImc.length ? (
          <Cuerpo tam={13} color={c.niebla}>{`Por tu IMC también cuidamos: ${deImc.map((x) => x.nombre.toLowerCase()).join(', ')}. Cambia con tus medidas.`}</Cuerpo>
        ) : null}
      </Tarjeta>

      <View style={{ backgroundColor: c.concreto, borderWidth: 1, borderColor: c.grafito, borderRadius: 4 }}>
        <Interruptor
          etiqueta="Vibración"
          detalle="Al terminar el descanso"
          valor={vibrar}
          onCambio={(v) => {
            setVibrar(v);
            void setVibracion(v);
          }}
        />
        <View style={{ height: 1, backgroundColor: c.grafito }} />
        <Interruptor etiqueta="Modo claro" detalle="Próximamente · para entrenar al aire libre" valor={false} onCambio={() => {}} deshabilitado />
        <View style={{ height: 1, backgroundColor: c.grafito }} />
        <Interruptor etiqueta="Recordatorios" detalle="Próximamente · lun, mié y vie" valor={false} onCambio={() => {}} deshabilitado />
      </View>

      <View style={{ backgroundColor: c.concreto, borderWidth: 1, borderColor: c.grafito, borderRadius: 4 }}>
        <Fila texto="Cambiar contraseña" proximamente />
        <Fila texto={descargando ? 'Preparando tus datos…' : 'Descargar mis datos'} onPress={descargar} />
        <Fila texto="Borrar mis datos" color={c.error} proximamente />
      </View>

      <Boton variante="secundario" onPress={() => void logout()}>Cerrar sesión</Boton>
      <Cuerpo tam={13} color={c.niebla}>
        Tus datos se tratan según la Ley 1581 de 2012. FitIA no reemplaza a un profesional de la salud. FitIA · Proyecto Integrador CUN 2026 · v1.0
      </Cuerpo>
    </Pantalla>
  );
}
