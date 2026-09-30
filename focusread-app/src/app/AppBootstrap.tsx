import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useFonts } from 'expo-font';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { Newsreader_400Regular, Newsreader_600SemiBold } from '@expo-google-fonts/newsreader';

import { semanticTokens } from '../design-system/tokens';
import { logger } from '../lib/logger';
import { useSessionStore } from '../state/sessionStore';
import { useSettingsStore } from '../state/settingsStore';

// Carga fuentes, ajustes y sesión antes de mostrar la app. Usa los tokens de "paper" porque
// todavía no se conoce el tema del usuario.
export function AppBootstrap({ children }: { children: React.ReactNode }) {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Newsreader_400Regular,
    Newsreader_600SemiBold,
  });
  const hydrated = useSettingsStore((s) => s.hydrated);
  const hydrate = useSettingsStore((s) => s.hydrate);
  const initSession = useSessionStore((s) => s.init);

  useEffect(() => {
    hydrate().catch((e) => logger.error('No se pudieron cargar los ajustes', e));
    initSession().catch((e) => logger.error('No se pudo leer la sesión', e));
  }, [hydrate, initSession]);

  // Si las fuentes fallan se sigue con la del sistema en vez de quedar en el spinner.
  if ((!fontsLoaded && !fontError) || !hydrated) {
    const boot = semanticTokens.paper;
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: boot.bg.base }}>
        <ActivityIndicator size="large" color={boot.accent.default} />
      </View>
    );
  }
  return <>{children}</>;
}
