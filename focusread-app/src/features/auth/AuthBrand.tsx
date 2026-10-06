import React from 'react';
import { View } from 'react-native';

import { AppText } from '../../design-system/atoms/AppText';
import { Icon } from '../../design-system/atoms/Icon';
import { useTheme } from '../../design-system/theme/useTheme';
import { es } from '../../i18n/es';

export function AuthBrand() {
  const { spacing } = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: spacing.sm }}>
      <Icon name="book-outline" size="lg" color="accent" />
      <AppText variant="display" align="center" accessibilityRole="header">
        {es.appName}
      </AppText>
    </View>
  );
}
