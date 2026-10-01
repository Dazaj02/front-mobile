import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { DevCatalogScreen } from '../design-system/catalog/DevCatalogScreen';
import type { AppStackParamList } from './types';

// Solo desarrollo. AppStack lo carga con un `require` bajo `__DEV__` para que Metro lo elimine
// por completo del bundle de producción (un `import` estático lo dejaría dentro aunque no se use).
export function DevCatalogRoute({ navigation }: NativeStackScreenProps<AppStackParamList, 'DevCatalog'>) {
  return <DevCatalogScreen onClose={() => navigation.goBack()} />;
}
