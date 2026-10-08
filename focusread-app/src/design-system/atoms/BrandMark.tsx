import React from 'react';
import { Image } from 'react-native';

import { useTheme } from '../theme/useTheme';

// Marca de FocusRead: libro abierto con el punto de foco. Es de un solo color: se tiñe con el acento
// del tema (azul en papel, ámbar en sepia, azul claro en oscuro) para que siempre contraste con el fondo.
const MARK = require('../../../assets/brand/mark.png');
const RATIO = 72 / 65; // proporción de la marca

export interface BrandMarkProps {
  width?: number;
}

// Decorativa: el nombre de la app ya lo anuncia el texto que la acompaña.
export function BrandMark({ width = 72 }: BrandMarkProps) {
  const { colors } = useTheme();
  return (
    <Image
      testID="brand-mark"
      source={MARK}
      style={{ width, height: width / RATIO, tintColor: colors.accent.default }}
      resizeMode="contain"
      accessibilityIgnoresInvertColors
      accessible={false}
      importantForAccessibility="no"
    />
  );
}
