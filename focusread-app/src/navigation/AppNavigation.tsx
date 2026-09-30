import React, { useMemo } from 'react';
import { DefaultTheme, NavigationContainer, type Theme as NavTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';

import { useTheme } from '../design-system/theme/useTheme';
import { linking } from './linking';
import { RootNavigator } from './RootNavigator';

// Contenedor de navegación con los colores del tema activo (evita destellos de fondo blanco).
export function AppNavigation() {
  const { colors, isDark } = useTheme();
  const navTheme = useMemo<NavTheme>(
    () => ({
      ...DefaultTheme,
      dark: isDark,
      colors: {
        ...DefaultTheme.colors,
        primary: colors.accent.default,
        background: colors.bg.base,
        card: colors.bg.elevated,
        text: colors.text.primary,
        border: colors.border.subtle,
        notification: colors.state.danger,
      },
    }),
    [colors, isDark],
  );
  return (
    <NavigationContainer theme={navTheme} linking={linking}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <RootNavigator />
    </NavigationContainer>
  );
}
