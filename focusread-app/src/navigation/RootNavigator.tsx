import React, { useEffect } from 'react';
import { View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

import { Spinner } from '../design-system/atoms/Spinner';
import { useTheme } from '../design-system/theme/useTheme';
import { logger } from '../lib/logger';
import { useSessionStore } from '../state/sessionStore';
import { useSettingsStore } from '../state/settingsStore';
import { AppStack } from './AppStack';
import { AuthStack } from './AuthStack';

// Sin sesión → AuthStack; con sesión → AppStack (pestañas, lector, importar, motor de IA, cuenta).
export function RootNavigator() {
  const status = useSessionStore((s) => s.status);
  const { colors } = useTheme();
  const queryClient = useQueryClient();

  // Aislamiento entre usuarios: al salir se vacía la caché de consultas (artículos, progreso…)
  // y al entrar se recargan los ajustes del usuario que acaba de iniciar sesión.
  useEffect(() => {
    if (status === 'signedOut') queryClient.clear();
    if (status === 'signedIn') useSettingsStore.getState().hydrate().catch((e) => logger.warn('No se pudieron recargar los ajustes', e));
  }, [status, queryClient]);

  if (status === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg.base }}>
        <Spinner size="lg" />
      </View>
    );
  }
  return status === 'signedIn' ? <AppStack /> : <AuthStack />;
}
