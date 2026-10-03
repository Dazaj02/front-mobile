// Nivel 3: decisiones por componente, derivadas de los tokens semánticos.
import { borderWidth, elevation, opacity, radii, sizes, spacing } from './primitives';
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
      // Sobre bg.inverse: pastilla clara con texto de tinta.
      inverse: { bg: s.text.inverse, fg: s.text.primary },
      pillRadius: radii.pill,
    },
    iconButton: { size: sizes.touchMin, icon: sizes.iconMd, radius: radii.pill, filled: { bg: s.bg.inverse, fg: s.text.inverse } },
    chip: {
      height: 36,
      hitSlop: (sizes.touchMin - 36) / 2,
      radius: radii.pill,
      paddingX: spacing.md,
      bg: s.bg.elevated,
      border: s.border.subtle,
      fg: s.text.secondary,
      active: { bg: s.accent.subtle, fg: s.accent.default },
      // Variante editorial: pestaña de texto subrayada.
      underline: { height: sizes.touchMin, active: s.text.primary, inactive: s.text.muted, indicator: borderWidth.thick },
    },
    card: {
      radius: radii.lg,
      padding: spacing.lg,
      bg: s.bg.elevated,
      elevation: elevation.level0, // editorial: sin sombra, solo filete
      border: s.border.subtle,
    },
    // Pieza destacada en tinta (Continúa leyendo).
    heroCard: { radius: radii.lg, padding: spacing.xl - spacing.xs, bg: s.bg.inverse, fg: s.text.inverse, muted: s.text.inverseMuted },
    // Fila de lista editorial: sin caja, separada por un filete.
    listRow: { paddingY: spacing.lg + spacing.xxs, divider: s.border.subtle, dividerWidth: borderWidth.thin },
    // Barra de progreso segmentada: un segmento por dosis.
    segmentedProgress: {
      height: spacing.xs,
      gap: 3,
      radius: radii.pill,
      track: s.border.subtle,
      fill: s.text.primary,
      inverse: { track: s.border.inverse, fill: s.text.inverse },
    },
    segmentedControl: { height: 40, radius: radii.md, padding: spacing.xs, track: s.bg.sunken, thumb: s.bg.elevated },
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
      bg: s.bg.base,
      border: s.border.subtle,
      active: s.text.primary,
      inactive: s.text.muted,
      indicator: spacing.xs, // punto bajo la pestaña activa
      labelMaxFontMultiplier: 1.3,
    },
    chart: { bar: s.data.neutral, barActive: s.data.highlight, height: spacing.xxxl * 2 + spacing.md },
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
