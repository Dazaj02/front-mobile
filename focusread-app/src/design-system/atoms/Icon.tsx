import React from 'react';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../theme/useTheme';
import { textColorValue, type TextColor } from './AppText';

export type IconName = React.ComponentProps<typeof Ionicons>['name'];
export type IconSize = 'sm' | 'md' | 'lg';

export interface IconProps {
  name: IconName;
  size?: IconSize;
  color?: TextColor;
}

// Decorativo: el significado lo aporta el control que lo contiene.
export function Icon({ name, size = 'md', color = 'primary' }: IconProps) {
  const { sizes, colors } = useTheme();
  const px = { sm: sizes.iconSm, md: sizes.iconMd, lg: sizes.iconLg }[size];
  return (
    <Ionicons
      name={name}
      size={px}
      color={textColorValue(colors, color)}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}
