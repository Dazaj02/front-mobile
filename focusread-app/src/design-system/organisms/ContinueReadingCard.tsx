import React from 'react';
import { View } from 'react-native';

import { AppText } from '../atoms/AppText';
import { Button } from '../atoms/Button';
import { ProgressBar } from '../atoms/ProgressBar';
import { useTheme } from '../theme/useTheme';

export interface ContinueReadingCardProps {
  title: string;
  doseLabel: string; // p. ej. "Dosis 2 de 5"
  progress: number;
  onContinue: () => void;
}

export function ContinueReadingCard({ title, doseLabel, progress, onContinue }: ContinueReadingCardProps) {
  const { components: c, colors, spacing } = useTheme();
  return (
    <View
      style={{
        gap: spacing.md,
        padding: c.card.padding,
        borderRadius: c.card.radius,
        backgroundColor: colors.accent.subtle,
      }}
    >
      <AppText variant="label" color="accent">
        Continúa leyendo
      </AppText>
      <AppText variant="title" numberOfLines={3}>
        {title}
      </AppText>
      <AppText variant="caption" color="secondary">
        {doseLabel}
      </AppText>
      <ProgressBar value={progress} accessibilityLabel={`Progreso de ${title}`} />
      <Button label="Continuar" icon="play" onPress={onContinue} accessibilityHint={`Abre ${title}`} />
    </View>
  );
}
