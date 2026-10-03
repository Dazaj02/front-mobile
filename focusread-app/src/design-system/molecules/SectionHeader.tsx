import React from 'react';
import { View } from 'react-native';

import { AppText } from '../atoms/AppText';
import { Button } from '../atoms/Button';
import { useTheme } from '../theme/useTheme';

export interface SectionHeaderProps {
  title: string;
  meta?: string; // dato breve a la derecha, p. ej. "4 artículos"
  // serif: sección de contenido (editorial) · overline: grupo de ajustes · title: sans clásico
  variant?: 'serif' | 'overline' | 'title';
  actionLabel?: string;
  onAction?: () => void;
}

const VARIANT = { serif: 'headline', overline: 'overline', title: 'title' } as const;

export function SectionHeader({ title, meta, variant = 'serif', actionLabel, onAction }: SectionHeaderProps) {
  const { spacing } = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.sm }}>
      <AppText variant={VARIANT[variant]} color={variant === 'overline' ? 'muted' : 'primary'} accessibilityRole="header">
        {title}
      </AppText>
      {meta ? (
        <AppText variant="label" color="muted">
          {meta}
        </AppText>
      ) : null}
      {actionLabel && onAction ? <Button variant="ghost" label={actionLabel} onPress={onAction} /> : null}
    </View>
  );
}
