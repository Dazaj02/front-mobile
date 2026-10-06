// Nivel 3: decisiones por componente, derivadas de los tokens semánticos.
import { elevation, opacity, radii, sizes, spacing } from './primitives';
import type { SemanticTokens } from './semantic';

export function createComponentTokens(s: SemanticTokens) {
  return {
    button: {
      height: sizes.touchMin,
      radius: radii.md,
      paddingX: spacing.lg,
      disabledOpacity: opacity.disabled,
      primary: { bg: s.accent.default, bgPressed: s.accent.pressed, fg: s.text.onAccent },
      secondary: { bg: s.bg.elevated, border: s.border.strong, fg: s.text.primary },
      ghost: { fg: s.accent.default },
    },
    iconButton: { size: sizes.touchMin, icon: sizes.iconMd, radius: radii.pill },
    chip: {
      height: 36,
      hitSlop: (sizes.touchMin - 36) / 2,
      radius: radii.pill,
      paddingX: spacing.md,
      bg: s.bg.elevated,
      border: s.border.subtle,
      fg: s.text.secondary,
      active: { bg: s.accent.subtle, fg: s.accent.default },
    },
    card: {
      radius: radii.lg,
      padding: spacing.lg,
      bg: s.bg.elevated,
      elevation: elevation.level1,
      border: s.border.subtle,
    },
    input: {
      height: 52,
      radius: radii.md,
      border: s.border.strong,
      borderWidth: 1,
      focusBorder: s.border.focus,
      focusBorderWidth: 2,
      errorBorder: s.state.danger,
      bg: s.bg.elevated,
      fg: s.text.primary,
      placeholder: s.text.muted,
    },
    progressBar: { height: 6, radius: radii.pill, track: s.bg.sunken, fill: s.accent.default },
    tabBar: {
      height: 64,
      bg: s.bg.elevated,
      border: s.border.subtle,
      active: s.accent.default,
      inactive: s.text.muted,
      labelMaxFontMultiplier: 1.3,
    },
    dock: { height: 64, bg: s.bg.elevated, elevation: elevation.level3, radius: radii.lg },
    sheet: {
      radiusTop: radii.xl,
      bg: s.bg.elevated,
      scrim: s.overlay.scrim,
      handle: s.border.strong,
    },
    badge: { height: 24, radius: radii.pill, paddingX: spacing.sm },
  };
}

export type ComponentTokens = ReturnType<typeof createComponentTokens>;
