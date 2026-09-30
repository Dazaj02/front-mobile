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
}

// Altura relativa al máximo de la serie; los días sin lectura conservan una marca mínima.
export function barHeights(values: readonly number[], maxHeight: number, minHeight: number): number[] {
  const max = Math.max(0, ...values);
  return values.map((v) => (max === 0 || v <= 0 ? minHeight : Math.max(minHeight, Math.round((v / max) * maxHeight))));
}

export function WeeklyChart({ data }: WeeklyChartProps) {
  const { colors, spacing, radii } = useTheme();
  const chartHeight = spacing.xxxl * 3;
  const heights = barHeights(
    data.map((d) => d.minutes),
    chartHeight,
    spacing.xs,
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm }}>
      {data.map((d, i) => (
        <View
          key={d.fullLabel}
          accessible
          accessibilityLabel={`${d.fullLabel}, ${d.minutes} ${d.minutes === 1 ? 'minuto' : 'minutos'}`}
          style={{ flex: 1, alignItems: 'center', gap: spacing.xs }}
        >
          <View style={{ height: chartHeight, justifyContent: 'flex-end', alignSelf: 'stretch', alignItems: 'center' }}>
            <View
              style={{
                width: '60%',
                height: heights[i],
                borderRadius: radii.sm,
                backgroundColor: d.minutes > 0 ? colors.accent.default : colors.border.subtle,
              }}
            />
          </View>
          <AppText variant="caption" color="muted" importantForAccessibility="no">
            {d.label}
          </AppText>
        </View>
      ))}
    </View>
  );
}
