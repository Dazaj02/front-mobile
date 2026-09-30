import React from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Button } from '../../design-system/atoms/Button';
import { EmptyState } from '../../design-system/organisms/EmptyState';
import { ScreenTemplate } from '../../design-system/templates/ScreenTemplate';
import { es } from '../../i18n/es';
import type { AppStackParamList } from '../../navigation/types';

// Esqueleto de F5: la Biblioteca real (lista, filtros, continuar leyendo) llega en F6.
export function LibraryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  return (
    <ScreenTemplate
      header={{
        title: es.library.title,
        // Un solo botón Importar en toda la app.
        actions: [{ icon: 'add', label: es.library.import, onPress: () => navigation.navigate('Import') }],
      }}
    >
      <EmptyState
        title={es.library.emptyTitle}
        message={es.library.emptyMessage}
        actionLabel={es.library.import}
        onAction={() => navigation.navigate('Import')}
      />
      {__DEV__ ? (
        <Button variant="ghost" label={es.library.devReader} onPress={() => navigation.navigate('Reader', { articleId: 'dev' })} />
      ) : null}
    </ScreenTemplate>
  );
}
