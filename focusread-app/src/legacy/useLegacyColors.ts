// TRANSITORIO (F1): mantiene vivas las pantallas del prototipo sobre los nuevos tokens.
// Se elimina cuando F5/F6 reescriban las pantallas con el design system.
import { useTheme } from '../design-system/theme/useTheme';

export interface ThemeColors {
  background: string;
  card: string;
  surface: string;
  surfaceContainerLow: string;
  surfaceContainer: string;
  surfaceContainerHigh: string;
  surfaceContainerHighest: string;
  border: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  secondary: string;
  secondaryContainer: string;
  onSecondaryContainer: string;
  tertiary: string;
  tertiaryContainer: string;
  tertiaryFixed: string;
  success: string;
  dockBackground: string;
  tagBackground: string;
  tagText: string;
}

export function useLegacyColors(): ThemeColors {
  const { colors: c } = useTheme();
  return {
    background: c.bg.base,
    card: c.bg.elevated,
    surface: c.bg.base,
    surfaceContainerLow: c.bg.sunken,
    surfaceContainer: c.bg.sunken,
    surfaceContainerHigh: c.border.subtle,
    surfaceContainerHighest: c.border.subtle,
    border: c.border.subtle,
    text: c.text.primary,
    textSecondary: c.text.secondary,
    textMuted: c.text.muted,
    primary: c.accent.default,
    primaryContainer: c.accent.default,
    onPrimaryContainer: c.text.onAccent,
    secondary: c.text.secondary,
    secondaryContainer: c.accent.subtle,
    onSecondaryContainer: c.accent.default,
    tertiary: c.state.warning,
    tertiaryContainer: c.state.warning,
    tertiaryFixed: c.accent.subtle,
    success: c.state.success,
    dockBackground: c.bg.elevated,
    tagBackground: c.accent.subtle,
    tagText: c.accent.default,
  };
}
