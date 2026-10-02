import { View } from 'react-native';
import type { ClasificacionImc } from '@fitia/shared';
import { c } from '../tema';
import { Cuerpo } from './Texto';

/** Segmentos OMS del diseño: el ancho de cada uno es proporcional a su rango (15–40). */
export const SEGMENTOS: { clase: ClasificacionImc; flex: number; color: string; etiqueta: string; corta: string }[] = [
  { clase: 'BAJO_PESO', flex: 3.5, color: c.advertencia, etiqueta: 'BAJO PESO', corta: 'Bajo' },
  { clase: 'NORMAL', flex: 6.5, color: c.exito, etiqueta: 'NORMAL', corta: 'Normal' },
  { clase: 'SOBREPESO', flex: 5, color: c.advertencia, etiqueta: 'SOBREPESO', corta: 'Sobre.' },
  { clase: 'OBESIDAD', flex: 10, color: c.senal, etiqueta: 'OBESIDAD', corta: 'Obesidad' },
];

export const colorClase = (cl: ClasificacionImc | null | undefined) => SEGMENTOS.find((s) => s.clase === cl)?.color ?? c.niebla;
export const etiquetaClase = (cl: ClasificacionImc | null | undefined) => SEGMENTOS.find((s) => s.clase === cl)?.etiqueta ?? '—';

/** Posición del marcador (0–100 %) en la escala 15–40 */
export const posicion = (imc: number) => Math.max(0, Math.min(100, ((imc - 15) / 25) * 100));

export function MedidorImc({
  imc, clase, alto = 12, marcador = true, rotulos = false, apagado = c.grafito,
}: {
  imc: number | null;
  clase: ClasificacionImc | null;
  alto?: number;
  marcador?: boolean;
  rotulos?: boolean;
  apagado?: string;
}) {
  return (
    <View accessibilityLabel={imc ? `IMC ${imc.toFixed(2).replace('.', ',')}` : 'IMC sin datos'} style={{ paddingTop: marcador ? 4 : 0 }}>
      <View style={{ flexDirection: 'row', gap: 2 }}>
        {SEGMENTOS.map((s) => (
          <View key={s.clase} style={{ flex: s.flex, minWidth: 0, height: alto, backgroundColor: s.clase === clase ? s.color : apagado }} />
        ))}
      </View>
      {marcador && imc ? (
        <View
          style={{
            position: 'absolute', top: 0, left: `${posicion(imc)}%`, width: 4, height: alto + 8, marginLeft: -2,
            backgroundColor: c.hueso, borderWidth: 1, borderColor: c.concreto,
          }}
        />
      ) : null}
      {rotulos ? (
        <View style={{ marginTop: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
          {SEGMENTOS.map((s) => (
            <Cuerpo key={s.clase} tam={12} peso="semi" color={c.niebla}>{s.corta}</Cuerpo>
          ))}
        </View>
      ) : null}
    </View>
  );
}
