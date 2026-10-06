import React from 'react';
import { Pressable } from 'react-native';

import { useTheme } from '../theme/useTheme';
import type { TextColor } from './AppText';
import { Icon, type IconName } from './Icon';

export interface IconButtonProps {
  icon: IconName;
  accessibilityLabel: string; // obligatorio: un botón de solo icono no tiene otro nombre
  onPress: () => void;
  color?: TextColor;
  disabled?: boolean;
  selected?: boolean;
}

export function IconButton({
  icon,
  accessibilityLabel,
  onPress,
  color = 'primary',
  disabled = false,
  selected,
}: IconButtonProps) {
  const { components: c, colors, opacity } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        width: c.iconButton.size,
        height: c.iconButton.size,
        borderRadius: c.iconButton.radius,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? opacity.disabled : 1,
        backgroundColor: pressed || selected ? colors.accent.subtle : 'transparent',
      })}
    >
      <Icon name={icon} size="md" color={color} />
    </Pressable>
  );
}
