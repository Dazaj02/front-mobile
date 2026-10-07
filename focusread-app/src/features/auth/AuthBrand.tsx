import React from 'react';
import { View } from 'react-native';

import { AppText } from '../../design-system/atoms/AppText';
import { BrandMark } from '../../design-system/atoms/BrandMark';
import { useTheme } from '../../design-system/theme/useTheme';
import { es } from '../../i18n/es';

export function AuthBrand() {
  const { spacing } = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: spacing.sm }}>
      <BrandMark width={72} />
      <AppText variant="display" align="center" accessibilityRole="header">
        {es.appName}
      </AppText>
    </View>
  );
}
