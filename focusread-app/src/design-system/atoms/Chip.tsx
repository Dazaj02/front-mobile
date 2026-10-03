import React from 'react';
import { Pressable } from 'react-native';

import { useTheme } from '../theme/useTheme';
import { borderWidth } from '../tokens';
import { AppText } from './AppText';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress: () => void;
  variant?: 'pill' | 'underline'; // underline: pestaña de texto editorial (filtros)
}

export function Chip({ label, selected = false, onPress, variant = 'pill' }: ChipProps) {
  const { components: c } = useTheme();
  const chip = c.chip;
  if (variant === 'underline') {
    const u = chip.underline;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected }}
        onPress={onPress}
        style={{
          minHeight: u.height,
          justifyContent: 'center',
          borderBottomWidth: u.indicator,
          borderBottomColor: selected ? u.active : 'transparent',
        }}
      >
        <AppText variant="label" color={selected ? 'primary' : 'muted'}>
          {label}
        </AppText>
      </Pressable>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      hitSlop={chip.hitSlop}
      onPress={onPress}
      style={{
        minHeight: chip.height,
        borderRadius: chip.radius,
        paddingHorizontal: chip.paddingX,
        justifyContent: 'center',
        borderWidth: borderWidth.thin,
        borderColor: selected ? chip.active.fg : chip.border,
        backgroundColor: selected ? chip.active.bg : chip.bg,
      }}
    >
      <AppText variant="label" color={selected ? 'accent' : 'secondary'}>
        {label}
      </AppText>
    </Pressable>
  );
}
