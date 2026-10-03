import React from 'react';
import { View } from 'react-native';

import { AppText } from '../atoms/AppText';
import { ProgressBar } from '../atoms/ProgressBar';
import { useTheme } from '../theme/useTheme';

export interface DailyProgressCardProps {
  minutesToday: number;
  dosesToday: number;
  goalMinutes?: number; // el contrato no define meta diaria: sin ella no hay barra
}

// Editorial: la cifra del día es la protagonista, en serif grande, sobre un filete.
export function DailyProgressCard({ minutesToday, dosesToday, goalMinutes }: DailyProgressCardProps) {
  const { components: c, spacing } = useTheme();
  const doses = `${dosesToday} ${dosesToday === 1 ? 'dosis completada' : 'dosis completadas'}`;
  const summary = `Hoy: ${minutesToday} min leídos, ${doses}`;
  return (
    <View
      accessible
      accessibilityLabel={goalMinutes ? `${summary}. Meta ${goalMinutes} minutos` : summary}
      style={{
        gap: spacing.xs,
        paddingBottom: spacing.xl,
        borderBottomWidth: c.listRow.dividerWidth,
        borderBottomColor: c.listRow.divider,
      }}
    >
      <AppText variant="label" color="secondary">
        Hoy llevas
      </AppText>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs }}>
        <AppText variant="metric">{minutesToday}</AppText>
        <AppText variant="headline" color="secondary">
          min
        </AppText>
      </View>
      <AppText variant="quote" color="secondary">
        {doses}
      </AppText>
      {goalMinutes ? (
        <ProgressBar value={minutesToday / goalMinutes} accessibilityLabel={`Meta diaria de ${goalMinutes} minutos`} />
      ) : null}
    </View>
  );
}
