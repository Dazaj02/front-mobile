import React from 'react';
import { Image } from 'react-native';

import { useTheme } from '../theme/useTheme';

// Marca de FocusRead: libro abierto con el punto de foco. Versión azul claro en tema oscuro.
const MARK = require('../../../assets/brand/mark.png');
const MARK_DARK = require('../../../assets/brand/mark-dark.png');
const RATIO = 72 / 65; // proporción de la marca

export interface BrandMarkProps {
  width?: number;
}

// Decorativa: el nombre de la app ya lo anuncia el texto que la acompaña.
export function BrandMark({ width = 72 }: BrandMarkProps) {
  const { isDark } = useTheme();
  return (
    <Image
      source={isDark ? MARK_DARK : MARK}
      style={{ width, height: width / RATIO }}
      resizeMode="contain"
      accessibilityIgnoresInvertColors
      accessible={false}
      importantForAccessibility="no"
    />
  );
}
