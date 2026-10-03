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
  variant?: 'plain' | 'filled'; // filled: círculo de tinta para la acción principal del encabezado
}

export function IconButton({
  icon,
  accessibilityLabel,
  onPress,
  color = 'primary',
  disabled = false,
  selected,
  variant = 'plain',
}: IconButtonProps) {
  const { components: c, colors, opacity } = useTheme();
  const filled = variant === 'filled';
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
        backgroundColor: filled
          ? pressed
            ? colors.accent.pressed
            : c.iconButton.filled.bg
          : pressed || selected
            ? colors.accent.subtle
            : 'transparent',
      })}
    >
      <Icon name={icon} size="md" color={filled ? 'inverse' : color} />
    </Pressable>
  );
}
