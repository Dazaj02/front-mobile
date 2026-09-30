import React from 'react';
import { View } from 'react-native';

import { AppText } from '../atoms/AppText';
import { Button } from '../atoms/Button';
import { useTheme } from '../theme/useTheme';

export interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
  const { spacing } = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
      <AppText variant="title" accessibilityRole="header">
        {title}
      </AppText>
      {actionLabel && onAction ? <Button variant="ghost" label={actionLabel} onPress={onAction} /> : null}
    </View>
  );
}
