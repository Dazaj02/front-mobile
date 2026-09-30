import React from 'react';
import { ActivityIndicator } from 'react-native';

import { useTheme } from '../theme/useTheme';

export interface SpinnerProps {
  size?: 'sm' | 'lg';
  onAccent?: boolean;
  accessibilityLabel?: string;
}

export function Spinner({ size = 'sm', onAccent = false, accessibilityLabel = 'Cargando' }: SpinnerProps) {
  const { colors } = useTheme();
  return (
    <ActivityIndicator
      size={size === 'sm' ? 'small' : 'large'}
      color={onAccent ? colors.text.onAccent : colors.accent.default}
      accessibilityLabel={accessibilityLabel}
    />
  );
}
