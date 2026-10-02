// No hay pantalla de login en docs/diseno/movil: se adapta "FitIA Ingresar" de la web al estilo móvil
// (inputs de 60 px, CTA Anton con golpe, pestañas segmentadas, casillas de la Ley 1581).
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { useSesion } from '@/sesion/SesionContext';
import { c } from '@/tema';
import * as vib from '@/lib/vibracion';
import { Pantalla } from '@/ui/Pantalla';
import { Boton } from '@/ui/Boton';
import { Campo, Casilla, Rejilla } from '@/ui/Controles';
import { mensajeError } from '@/ui/Estados';
import { Logo } from '@/ui/Iconos';
import { Cuerpo, Etiqueta, Titulo } from '@/ui/Texto';

const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.trim());

/** Misma regla y textos que el medidor de contraseña de la web. */
function fuerza(pw: string) {
  const n = pw.length;
  const score = n === 0 ? 0 : n < 8 ? 1 : /\d/.test(pw) && /[A-Za-z]/.test(pw) ? (n >= 12 ? 4 : 3) : 2;
  const msg =
    n === 0 ? 'Mínimo 8 caracteres. Mezcla letras y números.'
    : score <= 1 ? `Te faltan ${8 - n} caracteres.`
    : score === 2 ? 'Bien. Agrégale un número para hacerla más fuerte.'
    : score === 3 ? 'Fuerte.'
    : 'Muy fuerte. ¡Así es!';
  const color = score <= 1 ? c.error : score === 2 ? c.advertencia : c.exito;
  return { score, msg, color };
}

export default function Ingresar() {
  const { login, registro } = useSesion();
  const [reg, setReg] = useState(false);
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [verPw, setVerPw] = useState(false);
  const [terminos, setTerminos] = useState(false);
  const [datos, setDatos] = useState(false);
  const [intento, setIntento] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [soloEscritorio, setSoloEscritorio] = useState(false);

  const f = fuerza(pw);
  const malNombre = !nombres.trim();
  const malApellido = !apellidos.trim();
  const malEmail = !emailOk(email);
  const malPw = reg ? pw.length < 8 : !pw;
  const malLegal = !(terminos && datos);
  const valido = !malEmail && !malPw && (!reg || (!malNombre && !malApellido && !malLegal));
  const err = (malo: boolean, msg: string) => (intento && malo ? msg : null);

  async function enviar() {
    setIntento(true);
    setError(null);
    if (!valido) {
      vib.error();
      return;
    }
    setEnviando(true);
    try {
      const r = reg
        ? await registro({ nombres: nombres.trim(), apellidos: apellidos.trim(), email: email.trim(), password: pw, acepta_terminos: true })
        : await login(email.trim(), pw);
      if (!r.permitido) {
        setSoloEscritorio(true);
        return;
      }
      // Stack.Protected ya cambió de pila; sin perfil de salud, primero el onboarding
      router.replace(r.tienePerfil ? '/' : '/onboarding');
    } catch (e) {
      vib.error();
      setError(mensajeError(e));
    } finally {
      setEnviando(false);
    }
  }

  if (soloEscritorio)
    return (
      <Pantalla gap={18}>
        <Logo ancho={56} color={c.voltaje} />
        <Titulo tam={52}>Usa FitIA Control</Titulo>
        <Cuerpo>
          Las cuentas de administrador y de entrenador se manejan desde <Cuerpo peso="negrita">FitIA Control</Cuerpo>, el programa de escritorio. La app es para quienes entrenan.
        </Cuerpo>
        <Boton variante="secundario" onPress={() => { setSoloEscritorio(false); setPw(''); }}>Volver</Boton>
      </Pantalla>
    );

  return (
    <Pantalla gap={18}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Logo ancho={44} color={c.voltaje} />
        <Titulo tam={30}>FitIA</Titulo>
      </View>
      <Titulo tam={52}>{reg ? 'Crea tu\ncuenta.' : 'Hola de\nnuevo.'}</Titulo>
      <Rejilla
        unida
        display={false}
        alto={52}
        columnas={2}
        valor={reg}
        onElegir={(r) => { setReg(r); setIntento(false); setError(null); }}
        opciones={[{ valor: false, etiqueta: 'Ingresar' }, { valor: true, etiqueta: 'Crear cuenta' }]}
      />

      {reg ? (
        <>
          <Campo etiqueta="Nombre" valor={nombres} onCambio={setNombres} autoComplete="given-name" textContentType="givenName" error={err(malNombre, 'Escribe tu nombre.')} />
          <Campo etiqueta="Apellidos" valor={apellidos} onCambio={setApellidos} autoComplete="family-name" textContentType="familyName" error={err(malApellido, 'Escribe tus apellidos.')} />
        </>
      ) : null}
      <Campo
        etiqueta="Correo"
        valor={email}
        onCambio={setEmail}
        teclado="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        placeholder="tu@correo.com"
        error={err(malEmail, 'Revisa el correo: falta algo.')}
      />
      <Campo
        etiqueta="Contraseña"
        valor={pw}
        onCambio={setPw}
        secureTextEntry={!verPw}
        autoCapitalize="none"
        autoComplete={reg ? 'new-password' : 'current-password'}
        textContentType={reg ? 'newPassword' : 'password'}
        onSubmitEditing={enviar}
        error={err(malPw, reg ? 'Mínimo 8 caracteres.' : 'Escribe tu contraseña.')}
        derecha={
          <Pressable onPress={() => setVerPw(!verPw)} accessibilityRole="button" style={{ minHeight: 44, minWidth: 64, alignItems: 'center', justifyContent: 'center' }}>
            <Etiqueta tam={12} color={c.niebla}>{verPw ? 'OCULTAR' : 'VER'}</Etiqueta>
          </Pressable>
        }
      />
      {reg ? (
        <>
          <View style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {[1, 2, 3, 4].map((i) => (
                <View key={i} style={{ flex: 1, height: 6, backgroundColor: i <= f.score ? f.color : c.grafito }} />
              ))}
            </View>
            <Cuerpo tam={13} color={pw ? f.color : c.niebla}>{f.msg}</Cuerpo>
          </View>
          <Casilla valor={terminos} onCambio={setTerminos} error={intento && !terminos}>
            <Cuerpo tam={15} peso="negrita">Acepto los términos y condiciones de FitIA.</Cuerpo>
          </Casilla>
          <Casilla valor={datos} onCambio={setDatos} error={intento && !datos}>
            <Cuerpo tam={15}>Autorizo el tratamiento de mis datos personales (incluidos peso, estatura y molestias) según la Ley 1581 de 2012.</Cuerpo>
          </Casilla>
          {intento && malLegal ? (
            <Cuerpo tam={13} color={c.error}>Para crear tu cuenta necesitamos que aceptes los términos y el tratamiento de datos.</Cuerpo>
          ) : null}
        </>
      ) : null}

      {error ? (
        <View accessibilityRole="alert" style={{ padding: 12, borderWidth: 2, borderColor: c.error, borderRadius: 4 }}>
          <Cuerpo color={c.error} peso="semi">{error}</Cuerpo>
        </View>
      ) : null}

      <Boton display alto={64} cargando={enviando} onPress={enviar}>{reg ? 'CREAR CUENTA GRATIS' : 'ENTRAR'}</Boton>
      <Cuerpo tam={13} color={c.niebla}>FitIA no reemplaza a un profesional de la salud. Si sientes dolor fuerte, consulta a tu médico.</Cuerpo>
    </Pantalla>
  );
}
