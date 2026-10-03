import React from 'react';
import { View } from 'react-native';

import { AppText } from '../../design-system/atoms/AppText';
import { useTheme } from '../../design-system/theme/useTheme';
import { es } from '../../i18n/es';

// Marca editorial: inicial en serif sobre el acento + nombre en serif.
export function AuthBrand() {
  const { spacing, sizes, radii, colors } = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: spacing.md }}>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{
          width: sizes.touchMin,
          height: sizes.touchMin,
          borderRadius: radii.md,
          backgroundColor: colors.accent.default,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <AppText variant="headline" color="onAccent">
          {es.appName.charAt(0)}
        </AppText>
      </View>
      <AppText variant="display" align="center" accessibilityRole="header">
        {es.appName}
      </AppText>
    </View>
  );
}
