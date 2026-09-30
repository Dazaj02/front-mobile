import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { EmptyState } from '../../design-system/organisms/EmptyState';
import { ScreenTemplate } from '../../design-system/templates/ScreenTemplate';
import { es } from '../../i18n/es';
import type { AppStackParamList } from '../../navigation/types';

// Esqueleto de F5: eliminar cuenta con doble confirmación en F6.
export function AccountScreen({ navigation }: NativeStackScreenProps<AppStackParamList, 'Account'>) {
  return (
    <ScreenTemplate header={{ title: es.settings.accountRow, onBack: () => navigation.goBack() }}>
      <EmptyState icon="person-outline" title={es.settings.accountRow} message={es.common.comingSoon} />
    </ScreenTemplate>
  );
}
