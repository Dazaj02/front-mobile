import React from 'react';
import { View } from 'react-native';

import { AppText } from '../atoms/AppText';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';
import { useTheme } from '../theme/useTheme';

export interface ErrorStateProps {
  title: string;
  message?: string;
  retryLabel?: string;
  onRetry?: () => void;
}

export function ErrorState({ title, message, retryLabel = 'Reintentar', onRetry }: ErrorStateProps) {
  const { spacing } = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: spacing.md, padding: spacing.xl }}>
      <Icon name="alert-circle-outline" size="lg" color="danger" />
      <View accessible accessibilityRole="alert" style={{ gap: spacing.xs }}>
        <AppText variant="title" align="center">
          {title}
        </AppText>
        {message ? (
          <AppText variant="body" color="secondary" align="center">
            {message}
          </AppText>
        ) : null}
      </View>
      {onRetry ? <Button label={retryLabel} onPress={onRetry} /> : null}
    </View>
  );
}
