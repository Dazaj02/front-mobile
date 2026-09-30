import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { DevCatalogScreen } from '../design-system/catalog/DevCatalogScreen';
import { ImportScreen } from '../features/library/ImportScreen';
import { ReaderScreen } from '../features/reader/ReaderScreen';
import { AccountScreen } from '../features/settings/AccountScreen';
import { AIEngineScreen } from '../features/settings/AIEngineScreen';
import { useSyncTriggers } from '../services/sync/useSyncTriggers';
import { AppTabs } from './AppTabs';
import type { AppStackParamList } from './types';

const Stack = createNativeStackNavigator<AppStackParamList>();

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
      {__DEV__ ? (
        <Stack.Screen name="DevCatalog">{({ navigation }) => <DevCatalogScreen onClose={() => navigation.goBack()} />}</Stack.Screen>
      ) : null}
    </Stack.Navigator>
  );
}
