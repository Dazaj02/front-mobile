import React from 'react';
import { Image, View } from 'react-native';

import { AppText } from '../../design-system/atoms/AppText';
import { useTheme } from '../../design-system/theme/useTheme';
import { es } from '../../i18n/es';

// Marca de FocusRead: libro abierto con el punto de foco. Versión azul claro en tema oscuro.
const MARK = require('../../../assets/brand/mark.png');
const MARK_DARK = require('../../../assets/brand/mark-dark.png');
const MARK_SIZE = { width: 72, height: 65 }; // proporción de la marca (596 × 536)

export function AuthBrand() {
  const { spacing, isDark } = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: spacing.sm }}>
      <Image
        source={isDark ? MARK_DARK : MARK}
        style={MARK_SIZE}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
        accessible={false}
        importantForAccessibility="no"
      />
      <AppText variant="display" align="center" accessibilityRole="header">
        {es.appName}
      </AppText>
    </View>
  );
}
