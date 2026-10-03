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
        borderWidth: borderWidth.thick,
        borderColor: selected ? colors.border.focus : 'transparent',
      }}
    >
      <View
        style={{
          alignSelf: 'stretch',
          height: sizes.touchMin + spacing.xl,
          borderRadius: radii.sm,
          backgroundColor: preview.bg.base,
          borderWidth: borderWidth.thin,
          borderColor: preview.border.subtle,
          paddingHorizontal: spacing.md,
          gap: spacing.xs,
          justifyContent: 'center',
        }}
      >
        {/* "Aa" en la serif de lectura con el color de texto del tema que representa */}
        <AppText variant="headline" colorOverride={preview.text.primary} importantForAccessibility="no">
          Aa
        </AppText>
        <View style={{ height: 3, width: '80%', borderRadius: radii.pill, backgroundColor: preview.text.muted }} />
        <View style={{ height: 3, width: '55%', borderRadius: radii.pill, backgroundColor: preview.accent.default }} />
      </View>
      <AppText variant="label" color={selected ? 'primary' : 'secondary'} align="center">
        {label}
      </AppText>
    </Pressable>
  );
}
