import React from 'react';
import { View } from 'react-native';

import { AppText } from '../atoms/AppText';
import { Button } from '../atoms/Button';
import { SegmentedProgress } from '../atoms/SegmentedProgress';
import { useTheme } from '../theme/useTheme';

export interface ContinueReadingCardProps {
  title: string;
  doseLabel: string; // p. ej. "Dosis 2 de 5"
  totalDoses: number;
  completedDoses: number;
  category?: string | null;
  excerpt?: string | null; // una idea del resumen, en cursiva
  onContinue: () => void;
}

// Pieza destacada de la Biblioteca: superficie de tinta (bg.inverse) con progreso por dosis.
export function ContinueReadingCard({ title, doseLabel, totalDoses, completedDoses, category, excerpt, onContinue }: ContinueReadingCardProps) {
  const { components: c, spacing } = useTheme();
  const h = c.heroCard;
  return (
    <View style={{ gap: spacing.md + spacing.xxs, padding: h.padding, borderRadius: h.radius, backgroundColor: h.bg }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
        <AppText variant="overline" color="inverseMuted">
          Continúa leyendo
        </AppText>
        {category ? (
          <AppText variant="overline" color="inverseMuted">
            {`· ${category}`}
          </AppText>
        ) : null}
      </View>
      <AppText variant="headline" color="inverse" numberOfLines={3}>
        {title}
      </AppText>
      {excerpt ? (
        <AppText variant="quote" color="inverseMuted" numberOfLines={3}>
          {`“${excerpt}”`}
        </AppText>
      ) : null}
      <SegmentedProgress total={totalDoses} completed={completedDoses} tone="inverse" accessibilityLabel={`Progreso de ${title}`} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
        <AppText variant="label" color="inverseMuted">
          {doseLabel}
        </AppText>
        <Button variant="inverse" label="Continuar" icon="arrow-forward" iconPosition="end" onPress={onContinue} accessibilityHint={`Abre ${title}`} />
      </View>
    </View>
  );
}
