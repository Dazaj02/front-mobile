import React from 'react';
import { View } from 'react-native';

import { useTheme } from '../theme/useTheme';
import { borderWidth } from '../tokens';

export function Divider() {
  const { colors } = useTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={{ height: borderWidth.thin, backgroundColor: colors.border.subtle }}
    />
  );
}
