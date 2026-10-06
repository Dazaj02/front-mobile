import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useFonts } from 'expo-font';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { Newsreader_400Regular, Newsreader_600SemiBold } from '@expo-google-fonts/newsreader';

import { getContainer } from '../data/container';
import { semanticTokens, spacing, createTypography } from '../design-system/tokens';
import { es } from '../i18n/es';
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
  const [bootError, setBootError] = useState<string | null>(null);

  useEffect(() => {
    const fail = (e: unknown) => {
      logger.error('Fallo al iniciar la app', e);
      setBootError(e instanceof Error ? e.message : String(e));
    };
    try {
      getContainer().warmUp?.().catch(() => undefined); // despierta el servidor (Render gratis duerme)
    } catch (e) {
      return fail(e); // configuración de modo live incompleta
    }
    hydrate().catch(fail);
    initSession().catch(fail);
  }, [hydrate, initSession]);

  const boot = semanticTokens.paper;
  const type = createTypography(1);

  // Un error de configuración (p. ej. faltan variables del modo live) se muestra en vez de un spinner infinito.
  if (bootError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.md, backgroundColor: boot.bg.base }}>
        <Text accessibilityRole="header" style={{ ...type.headline, color: boot.text.primary }}>
          {es.boot.failedTitle}
        </Text>
        <Text style={{ ...type.body, color: boot.text.secondary }}>{bootError}</Text>
      </View>
    );
  }

  // Si las fuentes fallan se sigue con la del sistema en vez de quedar en el spinner.
  if ((!fontsLoaded && !fontError) || !hydrated) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: boot.bg.base }}>
        <ActivityIndicator size="large" color={boot.accent.default} />
      </View>
    );
  }
  return <>{children}</>;
}
