import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { esVerdadero, fechaCorta, formatoCop, luhnValido, type MetodoPago, type Pago, type Plan } from '@fitia/shared';
import { api } from '../api';
import { useSesion } from '../sesion/SesionContext';
import { c } from '../tema';
import * as vib from '../lib/vibracion';
import { HojaInferior } from '../ui/HojaInferior';
import { Boton } from '../ui/Boton';
import { Campo, Rejilla } from '../ui/Controles';
import { Giro, mensajeError } from '../ui/Estados';
import { Icono } from '../ui/Iconos';
import { Cuerpo, Etiqueta, Metrica, Titulo } from '../ui/Texto';

const Ctx = createContext<{ abrirPlanes: () => void }>({ abrirPlanes: () => {} });
export const usePlanes = () => useContext(Ctx);

/** La hoja de planes vive una sola vez en la raíz; cualquier pantalla la abre con abrirPlanes(). */
export function PlanesProvider({ children }: { children: ReactNode }) {
  const [abierta, setAbierta] = useState(false);
  const abrirPlanes = useCallback(() => setAbierta(true), []);
  return (
    <Ctx.Provider value={{ abrirPlanes }}>
      {children}
      <HojaInferior visible={abierta} onCerrar={() => setAbierta(false)} etiqueta="Planes">
        {abierta ? <ContenidoPlanes onCerrar={() => setAbierta(false)} /> : null}
      </HojaInferior>
    </Ctx.Provider>
  );
}

type Paso = 'elegir' | 'pago' | 'proc' | 'ok' | 'no';
const METODOS = [
  { valor: 'TARJETA' as MetodoPago, etiqueta: 'Tarjeta' },
  { valor: 'PSE' as MetodoPago, etiqueta: 'PSE' },
  { valor: 'NEQUI' as MetodoPago, etiqueta: 'Nequi' },
];
const BANCOS = ['Bancolombia', 'Davivienda', 'Banco de Bogotá', 'BBVA Colombia', 'Banco Caja Social', 'Banco Popular'];

function BannerDemo() {
  return (
    <View accessibilityRole="text" style={{ padding: 12, borderWidth: 2, borderStyle: 'dashed', borderColor: c.advertencia, borderRadius: 4 }}>
      <Cuerpo tam={14} peso="negrita" color={c.advertencia}>⚠ Modo demostración: no se realizan cobros reales.</Cuerpo>
    </View>
  );
}

function ContenidoPlanes({ onCerrar }: { onCerrar: () => void }) {
  const { perfil, recargarPerfil } = useSesion();
  const [planes, setPlanes] = useState<Plan[] | null>(null);
  const [errorPlanes, setErrorPlanes] = useState<unknown>(null);
  const [paso, setPaso] = useState<Paso>('elegir');
  const [anual, setAnual] = useState(false);
  const [metodo, setMetodo] = useState<MetodoPago>('TARJETA');
  const [num, setNum] = useState('');
  const [vence, setVence] = useState('');
  const [cvv, setCvv] = useState('');
  const [banco, setBanco] = useState<string | null>(null);
  const [cel, setCel] = useState('');
  const [intento, setIntento] = useState(false);
  const [pago, setPago] = useState<Pago | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.planes().then(setPlanes).catch(setErrorPlanes);
  }, []);

  const mes = planes?.find((p) => p.codigo === 'PREMIUM_MES');
  const ano = planes?.find((p) => p.codigo === 'PREMIUM_ANUAL');
  const elegido = anual ? ano : mes;
  const precio = elegido ? formatoCop(elegido.precio_cop) : '—';
  const ahorro = mes && ano ? Math.round((1 - ano.precio_cop / (mes.precio_cop * 12)) * 100) : 0;
  const plan = perfil?.plan;
  const esPro = !!plan && !esVerdadero(plan.con_publicidad);

  const dig = num.replace(/\D/g, '');
  const okN = luhnValido(dig);
  const okV = (() => {
    const m = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(vence);
    if (!m) return false;
    const fin = new Date(2000 + Number(m[2]), Number(m[1]), 0);
    return fin >= new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  })();
  const okC = /^\d{3,4}$/.test(cvv);
  const okCel = /^3\d{9}$/.test(cel.replace(/\D/g, ''));
  const valido = metodo === 'TARJETA' ? okN && okV && okC : metodo === 'PSE' ? !!banco : okCel;
  const mal = (ok: boolean, msg: string) => (intento && !ok ? msg : null);

  async function pagar() {
    setError(null);
    if (!valido || !elegido) {
      setIntento(true);
      vib.error();
      return;
    }
    setPaso('proc');
    try {
      // Solo viaja el número de tarjeta: el backend valida Luhn y guarda los últimos 4.
      // Vencimiento, CVV, banco y celular solo se validan aquí y NUNCA se envían.
      const [r] = await Promise.all([
        api.pagos.simular({ plan_codigo: elegido.codigo, metodo, ...(metodo === 'TARJETA' ? { numero_tarjeta: dig } : {}) }),
        new Promise((res) => setTimeout(res, 1400)),
      ]);
      setPago(r);
      setCvv('');
      if (r.estado === 'APROBADO') {
        vib.finDescanso();
        setPaso('ok');
        await recargarPerfil();
      } else {
        vib.error();
        setPaso('no');
      }
    } catch (e) {
      setError(mensajeError(e));
      setPaso('pago');
    }
  }

  if (esPro && paso === 'elegir')
    return (
      <>
        <BannerDemo />
        <Titulo tam={40}>Ya eres <Titulo tam={40} color={c.voltaje}>Pro</Titulo></Titulo>
        <Cuerpo>
          {plan?.nombre} · {plan?.rutinas_ia_mes} rutinas IA al mes, sin anuncios.
          {plan?.fecha_fin ? ` Activo hasta el ${fechaCorta(plan.fecha_fin)}.` : ''}
        </Cuerpo>
        <Cuerpo tam={14} color={c.niebla}>Volver a Free: próximamente.</Cuerpo>
        <Boton display alto={64} onPress={onCerrar}>LISTO</Boton>
      </>
    );

  return (
    <>
      <BannerDemo />

      {paso === 'elegir' ? (
        <>
          <Titulo tam={40}>
            Pásate a{'\n'}
            <Titulo tam={40} color={c.voltaje}>FitIA Pro</Titulo>
          </Titulo>
          {errorPlanes ? <Cuerpo color={c.error}>{mensajeError(errorPlanes)}</Cuerpo> : null}
          <Rejilla
            unida
            alto={64}
            display={false}
            columnas={2}
            valor={anual}
            onElegir={setAnual}
            opciones={[
              { valor: false, etiqueta: `${mes ? formatoCop(mes.precio_cop) : '—'}\nMensual` },
              { valor: true, etiqueta: `${ano ? formatoCop(ano.precio_cop) : '—'}\nAnual${ahorro > 0 ? ` · −${ahorro} %` : ''}` },
            ]}
          />
          <View style={{ gap: 8 }}>
            <Cuerpo>✓ <Cuerpo peso="negrita">{elegido?.rutinas_ia_mes ?? 10}</Cuerpo> rutinas IA al mes (Free: {plan?.rutinas_ia_mes ?? 2})</Cuerpo>
            <Cuerpo>✓ Sin publicidad</Cuerpo>
            <Cuerpo>✓ Todo lo de Free, que ya es completo</Cuerpo>
          </View>
          <Boton display alto={64} tam={24} deshabilitado={!elegido} onPress={() => { setPaso('pago'); setIntento(false); }}>
            {`CONTINUAR · ${precio}`}
          </Boton>
          <Boton variante="fantasma" alto={48} onPress={onCerrar}>Seguir con Free</Boton>
        </>
      ) : null}

      {paso === 'pago' ? (
        <>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
            <Titulo tam={32}>Pagar</Titulo>
            <Metrica tam={20} color={c.voltaje} style={{ flexShrink: 1 }}>{precio}</Metrica>
          </View>
          <Rejilla unida alto={56} display={false} columnas={3} valor={metodo} onElegir={(m) => { setMetodo(m); setIntento(false); }} opciones={METODOS} />
          {metodo === 'TARJETA' ? (
            <>
              <Campo
                etiqueta="Número de tarjeta"
                mono
                teclado="number-pad"
                autoComplete="cc-number"
                placeholder="4111 1111 1111 1111"
                valor={num}
                onCambio={(v) => setNum(v.replace(/\D/g, '').slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 '))}
                error={mal(okN, 'Revisa el número: no es una tarjeta válida.')}
                ayuda={okN && dig.endsWith('0000') ? 'Esta tarjeta de prueba simula un rechazo.' : 'Visa, Mastercard o Amex.'}
              />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Campo
                    etiqueta="Vence"
                    mono
                    teclado="number-pad"
                    placeholder="MM/AA"
                    valor={vence}
                    onCambio={(v) => {
                      const d = v.replace(/\D/g, '').slice(0, 4);
                      setVence(d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d);
                    }}
                    error={mal(okV, 'Fecha vencida o inválida.')}
                  />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Campo etiqueta="CVV" mono teclado="number-pad" secureTextEntry placeholder="123" valor={cvv} onCambio={(v) => setCvv(v.replace(/\D/g, '').slice(0, 4))} error={mal(okC, '3 o 4 números.')} />
                </View>
              </View>
            </>
          ) : null}
          {metodo === 'PSE' ? (
            <View style={{ gap: 6 }}>
              <Cuerpo tam={15} peso="negrita">Banco</Cuerpo>
              <Rejilla display={false} alto={48} columnas={2} valor={banco} onElegir={setBanco} opciones={BANCOS.map((b) => ({ valor: b, etiqueta: b }))} />
              {mal(!!banco, 'Elige tu banco.') ? <Cuerpo tam={13} color={c.error}>Elige tu banco.</Cuerpo> : null}
            </View>
          ) : null}
          {metodo === 'NEQUI' ? (
            <Campo
              etiqueta="Celular Nequi"
              mono
              teclado="phone-pad"
              placeholder="310 555 0142"
              valor={cel}
              onCambio={(v) => setCel(v.replace(/\D/g, '').slice(0, 10))}
              error={mal(okCel, 'Debe empezar por 3 y tener 10 números.')}
              ayuda="Te llegaría una notificación en Nequi para aceptar."
            />
          ) : null}
          {error ? <Cuerpo color={c.error}>{error}</Cuerpo> : null}
          <Boton display alto={64} tam={24} onPress={pagar}>{`PAGAR ${precio}`}</Boton>
          <Cuerpo tam={13} color={c.niebla} style={{ textAlign: 'center' }}>
            Prueba: tarjeta terminada en <Cuerpo tam={13} peso="negrita">0000</Cuerpo> = rechazo.
          </Cuerpo>
        </>
      ) : null}

      {paso === 'proc' ? (
        <View accessibilityLiveRegion="polite" style={{ minHeight: 280, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <Giro />
          <Titulo tam={30}>Procesando…</Titulo>
        </View>
      ) : null}

      {paso === 'ok' && pago ? (
        <>
          <View style={{ width: 72, height: 72, borderRadius: 4, backgroundColor: c.exito, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-7deg' }] }}>
            <Icono nombre="check" tam={36} grosor={3} color={c.asfalto} />
          </View>
          <Titulo tam={52}>¡Ya eres{'\n'}<Titulo tam={52} color={c.voltaje}>Pro!</Titulo></Titulo>
          <Etiqueta tam={14}>{`REF. ${pago.referencia} · ${formatoCop(pago.monto_cop)} (SIMULADO)`}</Etiqueta>
          <Boton display alto={64} onPress={onCerrar}>LISTO</Boton>
        </>
      ) : null}

      {paso === 'no' ? (
        <>
          <View style={{ width: 72, height: 72, borderRadius: 4, backgroundColor: c.error, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-7deg' }] }}>
            <Icono nombre="cerrar" tam={36} grosor={3} color={c.asfalto} />
          </View>
          <Titulo tam={44}>Pago rechazado</Titulo>
          <Cuerpo>
            {pago?.motivo_rechazo ?? 'El banco no autorizó el pago.'} <Cuerpo color={c.niebla}>No se cobró nada y sigues en Free.</Cuerpo>
          </Cuerpo>
          <Boton alto={64} tam={18} onPress={() => { setPaso('pago'); setIntento(false); }}>Intentar otra vez</Boton>
          <Boton variante="secundario" onPress={() => { setMetodo('NEQUI'); setPaso('pago'); setIntento(false); }}>Pagar con Nequi</Boton>
        </>
      ) : null}
    </>
  );
}
