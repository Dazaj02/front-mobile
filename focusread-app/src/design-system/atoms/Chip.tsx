import React from 'react';
import { Pressable } from 'react-native';

import { useTheme } from '../theme/useTheme';
import { borderWidth } from '../tokens';
import { AppText } from './AppText';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress: () => void;
}

export function Chip({ label, selected = false, onPress }: ChipProps) {
  const { components: c } = useTheme();
  const chip = c.chip;
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
