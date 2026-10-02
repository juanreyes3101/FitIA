import { useState, type ReactNode } from 'react';
import { Pressable, Text, TextInput, View, type KeyboardTypeOptions, type TextInputProps } from 'react-native';
import { F, MAX_ESCALA, c } from '../tema';
import { toque } from '../lib/vibracion';
import { Cuerpo, Etiqueta, Titulo } from './Texto';

/** Campo de 60 px. El TextInput va con flex:1 y minWidth:0: así no impone su ancho intrínseco (bug de la web). */
export function Campo({
  etiqueta, valor, onCambio, error, ayuda, mono, teclado, derecha, ...p
}: {
  etiqueta: string;
  valor: string;
  onCambio: (v: string) => void;
  error?: string | null;
  ayuda?: string;
  mono?: boolean;
  teclado?: KeyboardTypeOptions;
  derecha?: ReactNode;
} & Omit<TextInputProps, 'value' | 'onChangeText'>) {
  const [foco, setFoco] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Cuerpo tam={15} peso="negrita">{etiqueta}</Cuerpo>
      <View
        style={{
          minHeight: 60,
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: c.asfalto,
          borderWidth: 2,
          borderRadius: 4,
          borderColor: error ? c.error : foco ? c.voltaje : c.grafito,
        }}
      >
        <TextInput
          value={valor}
          onChangeText={onCambio}
          keyboardType={teclado}
          placeholderTextColor="#7A7A80"
          selectionColor={c.voltaje}
          maxFontSizeMultiplier={MAX_ESCALA}
          onFocus={() => setFoco(true)}
          onBlur={() => setFoco(false)}
          accessibilityLabel={etiqueta}
          {...p}
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: 56,
            paddingHorizontal: 14,
            color: c.hueso,
            fontFamily: mono ? F.monoNegrita : F.texto,
            fontSize: mono ? 20 : 18,
          }}
        />
        {derecha}
      </View>
      {error ? (
        <Cuerpo tam={13} color={c.error}>{error}</Cuerpo>
      ) : ayuda ? (
        <Cuerpo tam={13} color={c.niebla}>{ayuda}</Cuerpo>
      ) : null}
    </View>
  );
}

export interface Opcion<T> {
  valor: T;
  etiqueta: string;
  detalle?: string;
}

/**
 * Rejilla de opciones del diseño (botones de 2 px de borde, el elegido en Voltaje).
 * Cada celda tiene flexBasis 0 + minWidth 0: equivale a minmax(0,1fr) y evita el desborde de la web.
 */
export function Rejilla<T>({
  opciones, valor, onElegir, columnas = 2, alto = 76, display = true, multiple, unida,
}: {
  opciones: Opcion<T>[];
  valor: T | T[] | null;
  onElegir: (v: T) => void;
  columnas?: number;
  alto?: number;
  /** Etiqueta en Anton (opciones grandes) o en mono (cifras) */
  display?: boolean | 'mono';
  multiple?: boolean;
  /** Segmentado: celdas pegadas dentro de un solo borde */
  unida?: boolean;
}) {
  const filas: Opcion<T>[][] = [];
  for (let i = 0; i < opciones.length; i += columnas) filas.push(opciones.slice(i, i + columnas));
  const activo = (v: T) => (Array.isArray(valor) ? valor.includes(v) : valor === v);
  return (
    <View
      style={
        unida
          ? { borderWidth: 2, borderColor: c.grafito, borderRadius: 4, overflow: 'hidden' }
          : { gap: 6 }
      }
    >
      {filas.map((fila, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: unida ? 0 : 6 }}>
          {fila.map((o) => {
            const on = activo(o.valor);
            return (
              <Pressable
                key={String(o.valor)}
                onPress={() => {
                  toque();
                  onElegir(o.valor);
                }}
                accessibilityRole={multiple ? 'checkbox' : 'radio'}
                accessibilityState={multiple ? { checked: on } : { selected: on }}
                style={({ pressed }) => ({
                  flexGrow: 1,
                  flexBasis: 0,
                  minWidth: 0,
                  minHeight: alto,
                  padding: unida ? 4 : 10,
                  borderWidth: unida ? 0 : 2,
                  borderColor: on ? c.voltaje : c.grafito,
                  borderRadius: unida ? 0 : 4,
                  backgroundColor: on ? c.voltaje : 'transparent',
                  justifyContent: 'center',
                  alignItems: unida || display === 'mono' ? 'center' : 'flex-start',
                  transform: [{ translateY: pressed ? 2 : 0 }],
                })}
              >
                {display === true ? (
                  <Titulo tam={22} color={on ? c.asfalto : c.hueso} lineas={2}>
                    {(multiple && on ? '✓ ' : '') + o.etiqueta}
                  </Titulo>
                ) : display === 'mono' ? (
                  <Etiqueta tam={18} color={on ? c.asfalto : c.hueso}>{o.etiqueta}</Etiqueta>
                ) : (
                  <Cuerpo tam={15} peso="negrita" color={on ? c.asfalto : c.hueso} style={{ textAlign: 'center' }} numberOfLines={2}>
                    {o.etiqueta}
                  </Cuerpo>
                )}
              </Pressable>
            );
          })}
          {/* Celdas vacías para que la última fila no estire sus botones */}
          {Array.from({ length: columnas - fila.length }, (_, k) => (
            <View key={`v${k}`} style={{ flexGrow: 1, flexBasis: 0, minWidth: 0 }} />
          ))}
        </View>
      ))}
    </View>
  );
}

/** Interruptor cuadrado del diseño (52 × 30, perilla de 22). */
export function Interruptor({
  etiqueta, detalle, valor, onCambio, colorOn = c.voltaje, deshabilitado,
}: {
  etiqueta: string;
  detalle?: string;
  valor: boolean;
  onCambio: (v: boolean) => void;
  colorOn?: string;
  deshabilitado?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: valor, disabled: deshabilitado }}
      onPress={deshabilitado ? undefined : () => {
        toque();
        onCambio(!valor);
      }}
      style={{ minHeight: 64, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12, opacity: deshabilitado ? 0.55 : 1 }}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <Cuerpo peso="negrita">{etiqueta}</Cuerpo>
        {detalle ? <Cuerpo tam={13} color={c.niebla}>{detalle}</Cuerpo> : null}
      </View>
      <View style={{ width: 52, height: 30, borderRadius: 2, backgroundColor: valor ? colorOn : c.grafito }}>
        <View style={{ position: 'absolute', top: 4, left: valor ? 26 : 4, width: 22, height: 22, backgroundColor: valor ? c.asfalto : c.niebla }} />
      </View>
    </Pressable>
  );
}

/** Sello pequeño ("✓ SEGURO PARA TU ESPALDA", "SOBREPESO", "ENTRENO DE HOY"). */
export function Sello({ children, bg, color = c.asfalto, borde }: { children: string; bg?: string; color?: string; borde?: string }) {
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 2,
        backgroundColor: bg ?? 'transparent',
        borderWidth: borde ? 1.5 : 0,
        borderColor: borde,
        maxWidth: '100%',
      }}
    >
      <Etiqueta tam={12} color={color} numberOfLines={1}>{children}</Etiqueta>
    </View>
  );
}

/** Tarjeta Concreto con borde Grafito. */
export function Tarjeta({ children, style, borde = c.grafito }: { children: ReactNode; style?: object; borde?: string }) {
  return (
    <View style={[{ backgroundColor: c.concreto, borderWidth: 1, borderColor: borde, borderRadius: 4, padding: 16, gap: 10, overflow: 'hidden' }, style]}>
      {children}
    </View>
  );
}

/** Casilla de verificación (términos, tratamiento de datos). Área táctil de 44 px. */
export function Casilla({ valor, onCambio, children, error }: { valor: boolean; onCambio: (v: boolean) => void; children: ReactNode; error?: boolean }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: valor }}
      onPress={() => {
        toque();
        onCambio(!valor);
      }}
      style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start', minHeight: 44, paddingVertical: 4 }}
    >
      <View
        style={{
          width: 26, height: 26, marginTop: 2, borderRadius: 2, borderWidth: 2,
          borderColor: error ? c.error : valor ? c.voltaje : c.niebla,
          backgroundColor: valor ? c.voltaje : 'transparent', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {valor ? <Cuerpo tam={16} peso="negrita" color={c.asfalto}>✓</Cuerpo> : null}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>{children}</View>
    </Pressable>
  );
}

/**
 * Medida con − y + (peso, estatura). Rejilla 72 / resto / 72: la columna central lleva minWidth 0 y
 * el TextInput flex 1 (sin ancho intrínseco), así nunca empuja los botones fuera de la pantalla.
 * Acepta coma decimal (es-CO).
 */
export function Medida({
  etiqueta, unidad, valor, onCambio, paso, valido = true, editable = true, compacta,
}: {
  etiqueta: string;
  unidad: string;
  valor: string;
  onCambio: (v: string) => void;
  paso: number;
  valido?: boolean;
  editable?: boolean;
  /** Rótulo dentro de la caja (onboarding) en vez de encima (calculadora) */
  compacta?: boolean;
}) {
  const num = parseFloat(valor.replace(',', '.'));
  const sumar = (d: number) => {
    if (isNaN(num)) return;
    toque();
    onCambio(String(Math.round((num + d) * 10) / 10).replace('.', ','));
  };
  const boton = (signo: '−' | '+', d: number) => (
    <Pressable
      onPress={() => sumar(d)}
      accessibilityRole="button"
      accessibilityLabel={`${d > 0 ? 'Sumar' : 'Restar'} ${String(Math.abs(d)).replace('.', ',')} ${unidad}`}
      style={({ pressed }) => ({ width: compacta ? 64 : 72, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.grafito : 'transparent' })}
    >
      <Etiqueta tam={32} color={c.hueso} style={{ fontFamily: F.mono }}>{signo}</Etiqueta>
    </Pressable>
  );
  return (
    <View style={{ gap: 8 }}>
      {!compacta ? <Cuerpo tam={15} peso="negrita">{etiqueta}</Cuerpo> : null}
      <View style={{ flexDirection: 'row', minHeight: compacta ? 76 : 80, borderWidth: 2, borderColor: valido ? c.grafito : c.error, borderRadius: 4, overflow: 'hidden' }}>
        {boton('−', -paso)}
        <View style={{ flex: 1, minWidth: 0, borderLeftWidth: 1, borderRightWidth: 1, borderColor: c.grafito, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', alignSelf: 'stretch' }}>
            <TextInput
              value={valor}
              onChangeText={(v) => onCambio(v.replace(/[^\d,.]/g, '').replace('.', ','))}
              keyboardType="decimal-pad"
              editable={editable}
              accessibilityLabel={`${etiqueta} en ${unidad}`}
              maxFontSizeMultiplier={1.2}
              selectionColor={c.voltaje}
              style={{ flex: 1, minWidth: 0, textAlign: 'right', color: c.hueso, fontFamily: F.monoNegrita, fontSize: compacta ? 34 : 40, paddingVertical: 4 }}
            />
            <Text maxFontSizeMultiplier={1.2} style={{ width: 44, paddingLeft: 6, fontFamily: F.mono, fontSize: 18, color: c.niebla }}>{unidad}</Text>
          </View>
          {compacta ? <Etiqueta tam={12}>{etiqueta.toUpperCase()}</Etiqueta> : null}
        </View>
        {boton('+', paso)}
      </View>
    </View>
  );
}
