import React from 'react';
import { createNativeStackNavigator, type NativeStackScreenProps } from '@react-navigation/native-stack';

import { ImportScreen } from '../features/library/ImportScreen';
import { ReaderScreen } from '../features/reader/ReaderScreen';
import { AccountScreen } from '../features/settings/AccountScreen';
import { AIEngineScreen } from '../features/settings/AIEngineScreen';
import { useSyncTriggers } from '../services/sync/useSyncTriggers';
import { AppTabs } from './AppTabs';
import type { AppStackParamList } from './types';

const Stack = createNativeStackNavigator<AppStackParamList>();

// Catálogo de componentes: SOLO en desarrollo. El `require` bajo `__DEV__` hace que Metro lo
// elimine del bundle de producción (verificado exportando el bundle y buscando sus textos).
/* eslint-disable @typescript-eslint/no-require-imports */
const DevCatalogRoute: React.ComponentType<NativeStackScreenProps<AppStackParamList, 'DevCatalog'>> | null = __DEV__
  ? require('./DevCatalogRoute').DevCatalogRoute
  : null;
/* eslint-enable @typescript-eslint/no-require-imports */

// Orden de cierre con el botón atrás: hoja (Import) → lector → pestaña distinta de Biblioteca → salir.
export function AppStack() {
  useSyncTriggers(); // envía la outbox al abrir, al volver al primer plano y al recuperar la conexión
  return (
    <Stack.Navigator initialRouteName="Tabs" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={AppTabs} />
      <Stack.Screen name="Reader" component={ReaderScreen} />
      <Stack.Screen
        name="Import"
        component={ImportScreen}
        options={{ presentation: 'transparentModal', animation: 'none', contentStyle: { backgroundColor: 'transparent' } }}
      />
      <Stack.Screen name="AIEngine" component={AIEngineScreen} />
      <Stack.Screen name="Account" component={AccountScreen} />
      {DevCatalogRoute ? <Stack.Screen name="DevCatalog" component={DevCatalogRoute} /> : null}
    </Stack.Navigator>
  );
}
