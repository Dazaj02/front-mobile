import React from 'react';
import { View } from 'react-native';

import { AppText } from '../atoms/AppText';
import { ProgressBar } from '../atoms/ProgressBar';
import { useTheme } from '../theme/useTheme';
import { borderWidth } from '../tokens';

export interface DailyProgressCardProps {
  minutesToday: number;
  dosesToday: number;
  goalMinutes?: number; // el contrato no define meta diaria: sin ella no hay barra
}

export function DailyProgressCard({ minutesToday, dosesToday, goalMinutes }: DailyProgressCardProps) {
  const { components: c, spacing } = useTheme();
  const summary = `Hoy: ${minutesToday} min leídos, ${dosesToday} ${dosesToday === 1 ? 'dosis completada' : 'dosis completadas'}`;
  return (
    <View
      accessible
      accessibilityLabel={goalMinutes ? `${summary}. Meta ${goalMinutes} minutos` : summary}
      style={{
        gap: spacing.sm,
        padding: c.card.padding,
        borderRadius: c.card.radius,
        backgroundColor: c.card.bg,
        borderWidth: borderWidth.thin,
        borderColor: c.card.border,
      }}
    >
      <AppText variant="label" color="secondary">
        Tu día
      </AppText>
      <AppText variant="headline">{minutesToday} min</AppText>
      <AppText variant="caption" color="muted">
        {dosesToday} {dosesToday === 1 ? 'dosis completada' : 'dosis completadas'}
      </AppText>
      {goalMinutes ? (
        <ProgressBar value={minutesToday / goalMinutes} accessibilityLabel={`Meta diaria de ${goalMinutes} minutos`} />
      ) : null}
    </View>
  );
}
