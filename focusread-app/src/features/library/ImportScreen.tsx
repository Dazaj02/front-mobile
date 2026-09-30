import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppText } from '../../design-system/atoms/AppText';
import { SheetTemplate } from '../../design-system/templates/SheetTemplate';
import { es } from '../../i18n/es';
import type { AppStackParamList } from '../../navigation/types';

// Esqueleto de F5: el contenido (ImportSheet) llega en F6. La ruta es un modal transparente:
// el botón atrás de Android cierra primero la hoja y después el resto de la pila.
export function ImportScreen({ navigation }: NativeStackScreenProps<AppStackParamList, 'Import'>) {
  return (
    <SheetTemplate visible title={es.importSheet.title} onClose={() => navigation.goBack()}>
      <AppText variant="body" color="secondary">
        {es.common.comingSoon}
      </AppText>
    </SheetTemplate>
  );
}
