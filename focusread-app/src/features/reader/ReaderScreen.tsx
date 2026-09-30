import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { IconButton } from '../../design-system/atoms/IconButton';
import { EmptyState } from '../../design-system/organisms/EmptyState';
import { ReaderTemplate } from '../../design-system/templates/ReaderTemplate';
import { es } from '../../i18n/es';
import type { AppStackParamList } from '../../navigation/types';

// Esqueleto de F5 (pantalla completa, sin pestañas): el lector real llega en F6.
export function ReaderScreen({ navigation }: NativeStackScreenProps<AppStackParamList, 'Reader'>) {
  return (
    <ReaderTemplate top={<IconButton icon="chevron-back" accessibilityLabel={es.common.back} onPress={() => navigation.goBack()} />}>
      <EmptyState icon="book-outline" title={es.reader.title} message={es.common.comingSoon} />
    </ReaderTemplate>
  );
}
