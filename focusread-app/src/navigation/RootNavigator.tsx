import React from 'react';
import { View } from 'react-native';

import { Spinner } from '../design-system/atoms/Spinner';
import { useTheme } from '../design-system/theme/useTheme';
import { useSessionStore } from '../state/sessionStore';
import { AppStack } from './AppStack';
import { AuthStack } from './AuthStack';

// Sin sesión → AuthStack; con sesión → AppStack (pestañas, lector, importar, motor de IA, cuenta).
export function RootNavigator() {
  const status = useSessionStore((s) => s.status);
  const { colors } = useTheme();
  if (status === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg.base }}>
        <Spinner size="lg" />
      </View>
    );
  }
  return status === 'signedIn' ? <AppStack /> : <AuthStack />;
}
