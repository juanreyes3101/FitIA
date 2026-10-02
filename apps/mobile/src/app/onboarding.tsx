// Onboarding de 4 pasos (docs/diseno/movil/FitiaMovOnboarding): tú · medidas · objetivo · molestias.
// Al final: medición (el trigger asigna las condiciones de IMC) → PUT /perfil → POST /rutinas/generar.
import { useRef, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ACTIVIDADES, ApiError, OBJETIVOS, calcularImc, clasificarImc, formatoNumero,
  type CodigoCondicion, type NivelActividad, type Objetivo, type RutinaGenerada, type Sexo,
} from '@fitia/shared';
import { api } from '@/api';
import { useSesion } from '@/sesion/SesionContext';
import { usePlanes } from '@/planes/HojaPlanes';
import * as vib from '@/lib/vibracion';
import { c } from '@/tema';
import { Boton } from '@/ui/Boton';
import { Campo, Medida, Rejilla, Sello } from '@/ui/Controles';
import { mensajeError } from '@/ui/Estados';
import { Icono } from '@/ui/Iconos';
import { MedidorImc, colorClase, etiquetaClase } from '@/ui/MedidorImc';
import { Cuerpo, Etiqueta, Titulo } from '@/ui/Texto';

type Molestia = CodigoCondicion | 'NINGUNA';
const PASOS = ['TÚ', 'MEDIDAS', 'OBJETIVO', 'MOLESTIAS'];
const OBJ_DISENO: Objetivo[] = ['BAJAR_PESO', 'GANAR_MASA', 'TONIFICAR', 'ALIVIAR_LUMBAR'];
const MOLESTIAS: { valor: Molestia; etiqueta: string }[] = [
  { valor: 'DOLOR_LUMBAR', etiqueta: 'Lumbar' },
  { valor: 'DOLOR_RODILLA', etiqueta: 'Rodilla' },
  { valor: 'HIPERTENSION', etiqueta: 'Hipertensión' },
  { valor: 'NINGUNA', etiqueta: 'Ninguna' },
];
const num = (v: string) => parseFloat(v.replace(',', '.'));
const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Estado = { fase: 'form' } | { fase: 'gen'; paso: number } | { fase: 'listo'; rutina: RutinaGenerada } | { fase: 'sinCupo' } | { fase: 'error'; mensaje: string };

export default function Onboarding() {
  const { perfil, usuario, recargarPerfil } = useSesion();
  const { abrirPlanes } = usePlanes();
  const ins = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const carrusel = useRef<ScrollView>(null);
  const p = perfil?.perfil;
  const m = perfil?.medicion_actual;
  const propias = perfil?.condiciones.filter((x) => x.origen === 'AUTORREPORTE') ?? [];

  const [paso, setPaso] = useState(0);
  const [edad, setEdad] = useState(perfil?.edad ? String(perfil.edad) : '');
  const [sexo, setSexo] = useState<Sexo | null>(perfil?.sexo === 'F' || perfil?.sexo === 'M' ? perfil.sexo : null);
  const [peso, setPeso] = useState(m?.peso_kg ? String(Number(m.peso_kg)).replace('.', ',') : '70');
  const [est, setEst] = useState(m?.estatura_cm ? String(Number(m.estatura_cm)).replace('.', ',') : '165');
  const [act, setAct] = useState<NivelActividad>(p?.nivel_actividad && p.nivel_actividad !== 'MUY_ACTIVO' ? p.nivel_actividad : 'SEDENTARIO');
  const [obj, setObj] = useState<Objetivo>(p?.objetivo && OBJ_DISENO.includes(p.objetivo) ? p.objetivo : 'BAJAR_PESO');
  const [mol, setMol] = useState<Molestia[]>(propias.length ? propias.map((x) => x.codigo) : ['NINGUNA']);
  const [sev, setSev] = useState<1 | 2 | 3>((propias.find((x) => x.codigo === 'DOLOR_LUMBAR')?.severidad ?? 2) as 1 | 2 | 3);
  const [dias, setDias] = useState(p?.dias_disponibles && p.dias_disponibles >= 2 && p.dias_disponibles <= 5 ? p.dias_disponibles : 3);
  const [min, setMin] = useState([30, 45, 60, 90].includes(p?.minutos_por_sesion ?? 0) ? p!.minutos_por_sesion : 45);
  const [intento, setIntento] = useState(false);
  const [estado, setEstado] = useState<Estado>({ fase: 'form' });

  const nombre = (perfil?.nombre ?? usuario?.nombres ?? '').trim();
  const pn = num(peso);
  const en = num(est);
  const okEdad = /^\d{2}$/.test(edad) && Number(edad) >= 14 && Number(edad) <= 90;
  const okMedidas = pn >= 30 && pn <= 250 && en >= 120 && en <= 220;
  const imc = okMedidas ? calcularImc(pn, en) : null;
  const clase = imc != null ? clasificarImc(imc) : null;
  const pasoValido = [okEdad && !!sexo, okMedidas, true, true];

  function irA(n: number) {
    if (n < 0 || n > 3) return;
    vib.toque();
    setPaso(n);
    carrusel.current?.scrollTo({ x: n * width, animated: true });
  }

  function alDeslizar(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const n = Math.round(e.nativeEvent.contentOffset.x / width);
    if (n !== paso) {
      vib.toque();
      setPaso(n);
    }
  }

  function siguiente() {
    if (!pasoValido[paso]) {
      setIntento(true);
      vib.error();
      return;
    }
    if (paso < 3) {
      setIntento(false);
      irA(paso + 1);
      return;
    }
    const primero = pasoValido.findIndex((v) => !v);
    if (primero >= 0) {
      setIntento(true);
      vib.error();
      irA(primero);
      return;
    }
    void armar();
  }

  async function armar() {
    const molestias = mol.filter((x): x is CodigoCondicion => x !== 'NINGUNA');
    setEstado({ fase: 'gen', paso: 0 });
    // Los 5 renglones avanzan con las llamadas reales (mínimo 650 ms cada uno, como el diseño)
    const avanzar = async (n: number, tarea: Promise<unknown>) => {
      await Promise.all([tarea, espera(650)]);
      setEstado({ fase: 'gen', paso: n });
    };
    try {
      await avanzar(1, api.perfil.medicion({ peso_kg: pn, estatura_cm: en }));
      await avanzar(2, api.perfil.actualizar({
        nivel_actividad: act,
        objetivo: obj,
        lugar_entreno: 'GIMNASIO',
        dias_disponibles: dias,
        minutos_por_sesion: min,
        condiciones: molestias.map((codigo) => ({ codigo, severidad: codigo === 'DOLOR_LUMBAR' ? sev : 2 })),
        // La API pide fecha: la edad se aproxima al 1 de enero del año de nacimiento
        fecha_nacimiento: `${new Date().getFullYear() - Number(edad)}-01-01`,
        sexo: sexo ?? undefined,
      }));
      await avanzar(3, espera(0));
      const [rutina] = await Promise.all([api.rutinas.generar(), espera(650)]);
      setEstado({ fase: 'gen', paso: 4 });
      await espera(650);
      setEstado({ fase: 'gen', paso: 5 });
      await recargarPerfil();
      vib.finDescanso();
      setEstado({ fase: 'listo', rutina });
    } catch (e) {
      await recargarPerfil();
      vib.error();
      if (e instanceof ApiError && e.codigo === 'CUPO_IA_AGOTADO') setEstado({ fase: 'sinCupo' });
      else setEstado({ fase: 'error', mensaje: mensajeError(e) });
    }
  }

  const etiquetasMol = mol.includes('NINGUNA') ? null : MOLESTIAS.filter((x) => mol.includes(x.valor)).map((x) => x.etiqueta.toLowerCase()).join(', ');
  const renglones = [
    imc != null ? `IMC ${formatoNumero(imc, 2)}` : 'Tus medidas',
    etiquetasMol ? `Cuidando: ${etiquetasMol}` : 'Eligiendo ejercicios para tu nivel',
    `${dias} días de ${min} minutos`,
    `Objetivo: ${(OBJETIVOS.find((o) => o.valor === obj)?.etiqueta ?? '').toLowerCase()}`,
    'Revisando que todo sea seguro',
  ];

  if (estado.fase !== 'form') {
    const n = estado.fase === 'gen' ? estado.paso : 5;
    return (
      <View accessibilityViewIsModal style={{ flex: 1, backgroundColor: c.asfalto, paddingTop: ins.top + 24, paddingHorizontal: 16, paddingBottom: ins.bottom + 16, gap: 18 }}>
        <View style={{ width: 80, height: 80, backgroundColor: estado.fase === 'error' ? c.error : c.voltaje, borderRadius: 4, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-7deg' }] }}>
          <Icono nombre={estado.fase === 'error' ? 'cerrar' : estado.fase === 'listo' ? 'check' : 'ia'} tam={40} color={c.asfalto} />
        </View>
        <Titulo tam={52} accessibilityLiveRegion="polite">
          {estado.fase === 'gen' ? 'La IA está armando tu rutina…'
            : estado.fase === 'listo' ? `¡Lista, ${nombre.split(' ')[0] || 'parce'}!`
            : estado.fase === 'sinCupo' ? 'Perfil guardado'
            : 'Algo falló'}
        </Titulo>
        <View style={{ height: 10, backgroundColor: c.concreto, overflow: 'hidden' }}>
          <View style={{ height: '100%', width: `${Math.min(100, (n / 5) * 100)}%`, backgroundColor: estado.fase === 'error' ? c.error : c.voltaje }} />
        </View>
        <View style={{ gap: 12 }}>
          {renglones.map((t, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <Cuerpo peso="negrita" color={c.voltaje} style={{ width: 22 }}>{i < n ? '✓' : i === n && estado.fase === 'gen' ? '…' : '·'}</Cuerpo>
              <Cuerpo tam={17} color={i <= n ? c.hueso : '#5A5A60'} style={{ flex: 1, minWidth: 0 }}>{t}</Cuerpo>
            </View>
          ))}
        </View>
        {estado.fase === 'listo' && estado.rutina.proveedor === 'mock' ? (
          <View style={{ padding: 12, borderWidth: 1, borderColor: c.grafito, borderRadius: 4 }}>
            <Cuerpo tam={14} color={c.niebla}>Esta es una rutina base segura, armada por reglas. El validador de seguridad la revisó igual que una de la IA.</Cuerpo>
          </View>
        ) : null}
        {estado.fase === 'sinCupo' ? (
          <Cuerpo>Guardamos tus datos, pero este mes ya usaste tus rutinas con IA. Con Pro tienes 10 al mes.</Cuerpo>
        ) : null}
        {estado.fase === 'error' ? <Cuerpo color={c.error}>{estado.mensaje}</Cuerpo> : null}
        <View style={{ flex: 1 }} />
        {estado.fase === 'listo' ? <Boton display alto={68} tam={28} onPress={() => router.replace('/')}>VER MI DÍA DE HOY</Boton> : null}
        {estado.fase === 'sinCupo' ? (
          <>
            <Boton display alto={64} onPress={abrirPlanes}>VER PLANES</Boton>
            <Boton variante="secundario" onPress={() => router.replace('/')}>Ir a Hoy</Boton>
          </>
        ) : null}
        {estado.fase === 'error' ? (
          <>
            <Boton display alto={64} onPress={armar}>REINTENTAR</Boton>
            <Boton variante="secundario" onPress={() => setEstado({ fase: 'form' })}>Revisar mis datos</Boton>
          </>
        ) : null}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.asfalto, paddingTop: ins.top, paddingBottom: ins.bottom }}>
      <View style={{ paddingTop: 10, paddingHorizontal: 16, paddingBottom: 12, gap: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Etiqueta tam={14} color={c.hueso}>{`${paso + 1}/4 · ${PASOS[paso]}`}</Etiqueta>
          <Pressable onPress={() => router.replace('/')} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 6 }}>
            <Cuerpo tam={15} peso="negrita" color={c.niebla}>Luego</Cuerpo>
          </Pressable>
        </View>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {PASOS.map((_, i) => (
            <Pressable key={i} onPress={() => irA(i)} accessibilityLabel={`Paso ${i + 1}`} style={{ flex: 1, height: 6, backgroundColor: i <= paso ? c.voltaje : c.grafito }} />
          ))}
        </View>
      </View>

      <ScrollView
        ref={carrusel}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={alDeslizar}
        keyboardShouldPersistTaps="handled"
        style={{ flex: 1 }}
      >
        <Pagina ancho={width}>
          <Titulo tam={52}>{'Primero,\ncuéntanos\nde ti.'}</Titulo>
          <Campo etiqueta="¿Cómo te llamas?" valor={nombre} onCambio={() => {}} editable={false} ayuda="Es el nombre de tu cuenta." />
          <Campo
            etiqueta="Edad"
            mono
            teclado="number-pad"
            valor={edad}
            onCambio={(v) => setEdad(v.replace(/\D/g, '').slice(0, 2))}
            error={intento && !okEdad ? 'Entre 14 y 90 años.' : null}
          />
          <View style={{ gap: 6 }}>
            <Cuerpo tam={15} peso="negrita">Sexo</Cuerpo>
            <Rejilla display={false} alto={60} columnas={2} valor={sexo} onElegir={setSexo} opciones={[{ valor: 'F' as Sexo, etiqueta: 'Mujer' }, { valor: 'M' as Sexo, etiqueta: 'Hombre' }]} />
            {intento && !sexo ? <Cuerpo tam={13} color={c.error}>Elige una opción.</Cuerpo> : null}
          </View>
        </Pagina>

        <Pagina ancho={width}>
          <Titulo tam={52}>{'Peso y\nestatura'}</Titulo>
          <Medida compacta etiqueta="Peso" unidad="kg" valor={peso} onCambio={setPeso} paso={1} valido={pn >= 30 && pn <= 250} />
          <Medida compacta etiqueta="Estatura" unidad="cm" valor={est} onCambio={setEst} paso={1} valido={en >= 120 && en <= 220} />
          <View accessibilityLiveRegion="polite" style={{ backgroundColor: c.concreto, borderWidth: 1, borderColor: c.grafito, borderRadius: 4, padding: 14, gap: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 8 }}>
              <Titulo tam={56} color={c.voltaje} style={{ fontFamily: 'JetBrainsMono_700Bold', textTransform: 'none' }}>{imc != null ? formatoNumero(imc, 2) : '--,--'}</Titulo>
              <Sello bg={clase ? colorClase(clase) : c.niebla}>{clase ? etiquetaClase(clase) : 'REVISA'}</Sello>
            </View>
            <MedidorImc imc={imc} clase={clase} />
            <Cuerpo tam={14} color={c.niebla}>Tu IMC en vivo. Es una referencia, no un juicio.</Cuerpo>
          </View>
        </Pagina>

        <Pagina ancho={width}>
          <Titulo tam={52}>{'Nivel y\nobjetivo'}</Titulo>
          <Cuerpo tam={15} peso="negrita">Hoy te mueves…</Cuerpo>
          <Rejilla valor={act} onElegir={setAct} opciones={ACTIVIDADES.map((a) => ({ valor: a.valor, etiqueta: a.etiqueta }))} />
          <Cuerpo tam={15} peso="negrita">Quiero…</Cuerpo>
          <Rejilla valor={obj} onElegir={setObj} opciones={OBJETIVOS.filter((o) => OBJ_DISENO.includes(o.valor)).map((o) => ({ valor: o.valor, etiqueta: o.etiqueta }))} />
        </Pagina>

        <Pagina ancho={width}>
          <Titulo tam={52}>{'¿Algo te\nmolesta?'}</Titulo>
          <Rejilla
            multiple
            alto={68}
            valor={mol}
            onElegir={(v) =>
              setMol((actual) => {
                if (v === 'NINGUNA') return ['NINGUNA'];
                const resto = actual.filter((x) => x !== 'NINGUNA');
                const n = resto.includes(v) ? resto.filter((x) => x !== v) : [...resto, v];
                return n.length ? n : ['NINGUNA'];
              })
            }
            opciones={MOLESTIAS}
          />
          {mol.includes('DOLOR_LUMBAR') ? (
            <View style={{ gap: 6 }}>
              <Cuerpo tam={15} peso="negrita">Lumbar: ¿qué tan fuerte?</Cuerpo>
              <Rejilla unida display={false} alto={52} columnas={3} valor={sev} onElegir={setSev} opciones={[{ valor: 1 as const, etiqueta: 'Leve' }, { valor: 2 as const, etiqueta: 'Moderada' }, { valor: 3 as const, etiqueta: 'Fuerte' }]} />
            </View>
          ) : null}
          {(mol.includes('DOLOR_LUMBAR') && sev === 3) || mol.includes('HIPERTENSION') ? (
            <View style={{ padding: 12, borderWidth: 1, borderColor: c.advertencia, borderRadius: 4 }}>
              <Cuerpo tam={14} color={c.advertencia}>Antes de entrenar, consúltalo con un profesional de la salud. FitIA cuida la carga, pero no reemplaza a tu médico.</Cuerpo>
            </View>
          ) : null}
          <View style={{ gap: 6 }}>
            <Cuerpo tam={15} peso="negrita">Días por semana · minutos</Cuerpo>
            <Rejilla unida display="mono" alto={52} columnas={4} valor={dias} onElegir={setDias} opciones={[2, 3, 4, 5].map((n) => ({ valor: n, etiqueta: String(n) }))} />
            <Rejilla unida display="mono" alto={52} columnas={4} valor={min} onElegir={setMin} opciones={[30, 45, 60, 90].map((n) => ({ valor: n, etiqueta: `${n}′` }))} />
          </View>
        </Pagina>
      </ScrollView>

      <View style={{ paddingTop: 10, paddingHorizontal: 16, paddingBottom: 8, gap: 8 }}>
        <Boton display alto={68} tam={28} onPress={siguiente}>{paso === 3 ? 'ARMAR MI RUTINA' : 'SIGUIENTE'}</Boton>
        <Etiqueta tam={12} style={{ textAlign: 'center', fontFamily: 'JetBrainsMono_400Regular' }}>DESLIZA ← → PARA CAMBIAR DE PASO</Etiqueta>
      </View>
    </View>
  );
}

function Pagina({ ancho, children }: { ancho: number; children: ReactNode }) {
  return (
    <ScrollView style={{ width: ancho }} contentContainerStyle={{ paddingTop: 8, paddingHorizontal: 16, paddingBottom: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}
