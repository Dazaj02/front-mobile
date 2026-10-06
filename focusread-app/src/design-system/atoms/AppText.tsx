import React from 'react';
import { Text, type TextProps } from 'react-native';

import { useTheme } from '../theme/useTheme';
import type { SemanticTokens, TextVariant } from '../tokens';

export type TextColor =
  | 'primary'
  | 'secondary'
  | 'muted'
  | 'onAccent'
  | 'accent'
  | 'success'
  | 'warning'
  | 'danger';

export interface AppTextProps extends Omit<TextProps, 'style'> {
  variant?: TextVariant;
  color?: TextColor;
  align?: 'left' | 'center' | 'right';
}

export function textColorValue(colors: SemanticTokens, color: TextColor): string {
  const palette: Record<TextColor, string> = {
    primary: colors.text.primary,
    secondary: colors.text.secondary,
    muted: colors.text.muted,
    onAccent: colors.text.onAccent,
    accent: colors.accent.default,
    success: colors.state.success,
    warning: colors.state.warning,
    danger: colors.state.danger,
  };
  return palette[color];
}

// Único componente del design system que renderiza <Text>.
export function AppText({ variant = 'body', color = 'primary', align, ...rest }: AppTextProps) {
  const { typography, colors } = useTheme();
  return <Text {...rest} style={[typography[variant], { color: textColorValue(colors, color), textAlign: align }]} />;
}
