import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { EmptyState } from '../../design-system/organisms/EmptyState';
import { ScreenTemplate } from '../../design-system/templates/ScreenTemplate';
import { es } from '../../i18n/es';
import type { AppStackParamList } from '../../navigation/types';

// Esqueleto de F5: proveedor, modelo y key propia (SecureStore) en F6.
export function AIEngineScreen({ navigation }: NativeStackScreenProps<AppStackParamList, 'AIEngine'>) {
  return (
    <ScreenTemplate header={{ title: es.settings.aiEngine, onBack: () => navigation.goBack() }}>
      <EmptyState icon="sparkles-outline" title={es.settings.aiEngine} message={es.common.comingSoon} />
    </ScreenTemplate>
  );
}
