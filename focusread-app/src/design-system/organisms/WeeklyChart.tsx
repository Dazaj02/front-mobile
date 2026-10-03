import React from 'react';
import { View } from 'react-native';

import { AppText } from '../atoms/AppText';
import { useTheme } from '../theme/useTheme';

export interface WeeklyChartDatum {
  label: string; // "L"
  fullLabel: string; // "Lunes"
  minutes: number;
}

export interface WeeklyChartProps {
  data: readonly WeeklyChartDatum[];
  highlightIndex?: number; // barra destacada (por defecto la última: hoy)
}

// Altura relativa al máximo de la serie; los días sin lectura conservan una marca mínima.
export function barHeights(values: readonly number[], maxHeight: number, minHeight: number): number[] {
  const max = Math.max(0, ...values);
  return values.map((v) => (max === 0 || v <= 0 ? minHeight : Math.max(minHeight, Math.round((v / max) * maxHeight))));
}

// Editorial: barras neutras, la de hoy en el acento, y el valor encima de cada barra.
export function WeeklyChart({ data, highlightIndex = data.length - 1 }: WeeklyChartProps) {
  const { components: c, spacing, radii } = useTheme();
  const chartHeight = c.chart.height;
  const heights = barHeights(
    data.map((d) => d.minutes),
    chartHeight,
    spacing.xs,
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm }}>
      {data.map((d, i) => {
        const active = i === highlightIndex;
        return (
          <View
            key={d.fullLabel}
            accessible
            accessibilityLabel={`${d.fullLabel}, ${d.minutes} ${d.minutes === 1 ? 'minuto' : 'minutos'}`}
            style={{ flex: 1, alignItems: 'center', gap: spacing.xs }}
          >
            <AppText variant="caption" color={active ? 'primary' : 'muted'} importantForAccessibility="no">
              {d.minutes > 0 ? String(d.minutes) : '—'}
            </AppText>
            <View style={{ height: chartHeight, justifyContent: 'flex-end', alignSelf: 'stretch' }}>
              <View
                style={{
                  alignSelf: 'stretch',
                  height: heights[i],
                  borderRadius: radii.sm / 2,
                  backgroundColor: active ? c.chart.barActive : c.chart.bar,
                }}
              />
            </View>
            <AppText variant="label" color={active ? 'primary' : 'muted'} importantForAccessibility="no">
              {d.label}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}
