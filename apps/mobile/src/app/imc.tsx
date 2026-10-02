import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { calcularImc, clasificarImc, formatoNumero, type ClasificacionImc } from '@fitia/shared';
import { api } from '@/api';
import { useSesion } from '@/sesion/SesionContext';
import * as vib from '@/lib/vibracion';
import { F, c, extra } from '@/tema';
import { Pantalla } from '@/ui/Pantalla';
import { Boton } from '@/ui/Boton';
import { Medida, Sello } from '@/ui/Controles';
import { mensajeError } from '@/ui/Estados';
import { Icono } from '@/ui/Iconos';
import { MedidorImc, colorClase, etiquetaClase } from '@/ui/MedidorImc';
import { Cuerpo, Titulo } from '@/ui/Texto';
import { useToast } from '@/ui/Toast';

const MENSAJES: Record<ClasificacionImc, string> = {
  BAJO_PESO: 'Tu rutina buscará ganar fuerza y masa, sin afán.',
  NORMAL: 'Estás en rango. A mantener y sumar fuerza.',
  SOBREPESO: 'Cardio suave y fuerza: paso a paso, sin castigar las rodillas.',
  OBESIDAD: 'Empezamos suave, cuidando rodillas y espalda.',
};
const num = (v: string) => parseFloat(v.replace(',', '.'));

export default function Imc() {
  const { perfil, recargarPerfil } = useSesion();
  const avisar = useToast();
  const m = perfil?.medicion_actual;
  const [peso, setPeso] = useState(m?.peso_kg ? String(Number(m.peso_kg)).replace('.', ',') : '70');
  const [est, setEst] = useState(m?.estatura_cm ? String(Number(m.estatura_cm)).replace('.', ',') : '165');
  const [guardando, setGuardando] = useState(false);
  const [mensajeApi, setMensajeApi] = useState<string | null>(null);

  const p = num(peso);
  const e = num(est);
  const okP = p >= 30 && p <= 250;
  const okE = e >= 120 && e <= 220;
  const imc = okP && okE ? calcularImc(p, e) : null;
  const clase = imc != null ? clasificarImc(imc) : null;

  // Cálculo local al instante; la API confirma con su mensaje (con espera para no pedir en cada tecla)
  useEffect(() => {
    setMensajeApi(null);
    if (imc == null) return;
    const ctl = new AbortController();
    const t = setTimeout(() => {
      api.imc(p, e, ctl.signal).then((r) => setMensajeApi(r.mensaje)).catch(() => {});
    }, 500);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [p, e, imc]);

  async function guardar() {
    if (imc == null) {
      vib.error();
      avisar('err', 'Revisa los datos', 'Peso o estatura fuera de rango.');
      return;
    }
    setGuardando(true);
    try {
      // El trigger de la BD asigna o retira BAJO_PESO, SOBREPESO u OBESIDAD con esta medición
      await api.perfil.medicion({ peso_kg: p, estatura_cm: e });
      await recargarPerfil();
      vib.golpe();
      avisar('ok', 'Medida guardada', `IMC ${formatoNumero(imc, 2)} · la verás en Progreso.`);
    } catch (err) {
      avisar('err', 'No se pudo guardar', mensajeError(err));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Pantalla gap={16}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          style={{ width: 48, height: 48, borderWidth: 2, borderColor: c.grafito, borderRadius: 4, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icono nombre="atras" tam={22} color={c.hueso} />
        </Pressable>
        <Titulo tam={34} style={{ flex: 1 }}>Calculadora IMC</Titulo>
      </View>

      <View accessibilityLiveRegion="polite" style={{ overflow: 'hidden', backgroundColor: c.concreto, borderWidth: 1, borderColor: c.grafito, borderRadius: 4, padding: 18, gap: 16 }}>
        <Text aria-hidden maxFontSizeMultiplier={1} style={{ position: 'absolute', right: -8, top: -28, fontFamily: F.titulo, fontSize: 150, lineHeight: 160, color: extra.numeroFondo }}>IMC</Text>
        <Text maxFontSizeMultiplier={1.1} numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: F.monoNegrita, fontSize: 88, lineHeight: 100, letterSpacing: -4, color: c.voltaje }}>
          {imc != null ? formatoNumero(imc, 2) : '--,--'}
        </Text>
        <Sello bg={clase ? colorClase(clase) : c.niebla}>{clase ? etiquetaClase(clase) : 'REVISA LOS DATOS'}</Sello>
        <MedidorImc imc={imc} clase={clase} alto={18} rotulos />
        <Cuerpo>{clase ? (mensajeApi ?? MENSAJES[clase]) : 'Peso 30–250 kg y estatura 120–220 cm.'}</Cuerpo>
      </View>

      <Medida etiqueta="Peso" unidad="kg" valor={peso} onCambio={setPeso} paso={0.5} valido={okP} />
      <Medida etiqueta="Estatura" unidad="cm" valor={est} onCambio={setEst} paso={1} valido={okE} />
      <Boton display alto={64} cargando={guardando} onPress={guardar}>GUARDAR MEDIDA</Boton>
      <Cuerpo tam={14} color={c.niebla}>El IMC es una referencia, no un diagnóstico. No distingue músculo de grasa.</Cuerpo>
    </Pantalla>
  );
}
