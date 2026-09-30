import React from 'react';
import { View } from 'react-native';

import { AppText } from '../atoms/AppText';
import { Button } from '../atoms/Button';
import { Icon, type IconName } from '../atoms/Icon';
import { useTheme } from '../theme/useTheme';

export interface EmptyStateProps {
  icon?: IconName;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon = 'library-outline', title, message, actionLabel, onAction }: EmptyStateProps) {
  const { spacing } = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: spacing.md, padding: spacing.xl }}>
      <Icon name={icon} size="lg" color="muted" />
      <AppText variant="title" align="center" accessibilityRole="header">
        {title}
      </AppText>
      {message ? (
        <AppText variant="body" color="secondary" align="center">
          {message}
        </AppText>
      ) : null}
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} /> : null}
    </View>
  );
}
