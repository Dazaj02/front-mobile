import React from 'react';
import { Pressable, View } from 'react-native';

import { AppText } from '../atoms/AppText';
import { useTheme } from '../theme/useTheme';
import { borderWidth, semanticTokens, type ThemeMode } from '../tokens';

export interface ThemeSwatchProps {
  mode: ThemeMode;
  label: string;
  selected: boolean;
  onPress: () => void;
}

// La vista previa usa los tokens del tema que representa, no los del tema activo.
export function ThemeSwatch({ mode, label, selected, onPress }: ThemeSwatchProps) {
  const { colors, spacing, radii, sizes } = useTheme();
  const preview = semanticTokens[mode];
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={{
        flexGrow: 1,
        flexBasis: 0,
        minHeight: sizes.touchMin,
        gap: spacing.xs,
        alignItems: 'center',
        padding: spacing.sm,
        borderRadius: radii.md,
        borderWidth: selected ? borderWidth.thick : borderWidth.thin,
        borderColor: selected ? colors.border.focus : colors.border.subtle,
      }}
    >
      <View
        style={{
          alignSelf: 'stretch',
          height: sizes.touchMin,
          borderRadius: radii.sm,
          backgroundColor: preview.bg.base,
          borderWidth: borderWidth.thin,
          borderColor: preview.border.subtle,
          padding: spacing.sm,
          gap: spacing.xs,
          justifyContent: 'center',
        }}
      >
        <View style={{ height: spacing.sm, width: '70%', borderRadius: radii.pill, backgroundColor: preview.text.primary }} />
        <View style={{ height: spacing.sm, width: '40%', borderRadius: radii.pill, backgroundColor: preview.accent.default }} />
      </View>
      <AppText variant="label" color={selected ? 'accent' : 'secondary'} align="center">
        {label}
      </AppText>
    </Pressable>
  );
}
