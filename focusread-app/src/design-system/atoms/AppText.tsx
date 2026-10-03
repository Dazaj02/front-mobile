import React from 'react';
import { Text, type TextProps } from 'react-native';

import { useTheme } from '../theme/useTheme';
import type { SemanticTokens, TextVariant } from '../tokens';

export type TextColor =
  | 'primary'
  | 'secondary'
  | 'muted'
  | 'onAccent'
  | 'inverse'
  | 'inverseMuted'
  | 'accent'
  | 'success'
  | 'warning'
  | 'danger';

export interface AppTextProps extends Omit<TextProps, 'style'> {
  variant?: TextVariant;
  color?: TextColor;
  align?: 'left' | 'center' | 'right';
  colorOverride?: string; // solo para vistas previas de otro tema (ThemeSwatch); viene de semanticTokens
}

export function textColorValue(colors: SemanticTokens, color: TextColor): string {
  const palette: Record<TextColor, string> = {
    primary: colors.text.primary,
    secondary: colors.text.secondary,
    muted: colors.text.muted,
    onAccent: colors.text.onAccent,
    inverse: colors.text.inverse,
    inverseMuted: colors.text.inverseMuted,
    accent: colors.accent.default,
    success: colors.state.success,
    warning: colors.state.warning,
    danger: colors.state.danger,
  };
  return palette[color];
}

// Único componente del design system que renderiza <Text>.
export function AppText({ variant = 'body', color = 'primary', align, colorOverride, ...rest }: AppTextProps) {
  const { typography, colors } = useTheme();
  return <Text {...rest} style={[typography[variant], { color: colorOverride ?? textColorValue(colors, color), textAlign: align }]} />;
}
