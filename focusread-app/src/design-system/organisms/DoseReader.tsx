import React from 'react';
import { View } from 'react-native';

import { AppText } from '../atoms/AppText';
import { Button } from '../atoms/Button';
import { ProgressBar } from '../atoms/ProgressBar';
import { parseListLine } from '../../domain/readableText';
import { useTheme } from '../theme/useTheme';

export interface DoseReaderProps {
  title?: string | null;
  content: string;
  position: number; // base 0
  total: number;
  progress: number; // 0–1, tiempo activo de la dosis (sin cuenta regresiva)
  onPrev?: () => void;
  onNext: () => void;
  nextLabel?: string;
}

export function DoseReader({ title, content, position, total, progress, onPrev, onNext, nextLabel }: DoseReaderProps) {
  const { spacing } = useTheme();
  const paragraphs = content.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const isLast = position >= total - 1;
  return (
    <View style={{ gap: spacing.lg }}>
      <View style={{ gap: spacing.xs }}>
        <AppText variant="caption" color="secondary">
          Dosis {position + 1} de {total}
        </AppText>
        <ProgressBar value={progress} accessibilityLabel={`Progreso de la dosis ${position + 1}`} />
      </View>
      {title ? (
        <AppText variant="readingTitle" accessibilityRole="header">
          {title}
        </AppText>
      ) : null}
      <View style={{ gap: spacing.lg }}>
        {paragraphs.map((p, i) => {
          const lines = p.split(/\n/).map((l) => l.trim()).filter(Boolean);
          if (!lines.some((l) => parseListLine(l))) {
            return (
              <AppText key={i} variant="reading">
                {lines.join(' ')}
              </AppText>
            );
          }
          // Lista: cada elemento con su número o viñeta y sangría francesa.
          return (
            <View key={i} style={{ gap: spacing.sm }}>
              {lines.map((line, j) => {
                const item = parseListLine(line);
                if (!item) {
                  return (
                    <AppText key={j} variant="reading">
                      {line}
                    </AppText>
                  );
                }
                return (
                  <View key={j} style={{ flexDirection: 'row', gap: spacing.sm }}>
                    <View style={{ minWidth: spacing.xl }}>
                      <AppText variant="reading" color="accent">
                        {item.marker}
                      </AppText>
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText variant="reading">{item.text}</AppText>
                    </View>
                  </View>
                );
              })}
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
        {onPrev && position > 0 ? (
          <View style={{ flexGrow: 1 }}>
            <Button variant="secondary" label="Anterior" icon="chevron-back" onPress={onPrev} />
          </View>
        ) : null}
        <View style={{ flexGrow: 1 }}>
          <Button label={nextLabel ?? (isLast ? 'Terminar' : 'Siguiente dosis')} onPress={onNext} />
        </View>
      </View>
    </View>
  );
}
