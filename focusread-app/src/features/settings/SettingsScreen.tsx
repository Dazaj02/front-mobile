import React from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { AppText } from '../../design-system/atoms/AppText';
import { Button } from '../../design-system/atoms/Button';
import { Divider } from '../../design-system/atoms/Divider';
import { FontSizeStepper } from '../../design-system/molecules/FontSizeStepper';
import { SectionHeader } from '../../design-system/molecules/SectionHeader';
import { SettingRow } from '../../design-system/molecules/SettingRow';
import { ThemeSwatch } from '../../design-system/molecules/ThemeSwatch';
import { ScreenTemplate } from '../../design-system/templates/ScreenTemplate';
import { useTheme } from '../../design-system/theme/useTheme';
import { THEME_MODES } from '../../design-system/tokens';
import { es } from '../../i18n/es';
import type { AppStackParamList } from '../../navigation/types';
import { useSessionStore } from '../../state/sessionStore';
import { useSettingsStore } from '../../state/settingsStore';

// Esqueleto de F5: Apariencia y Cuenta básica. El resto de secciones (lectura, voz, accesibilidad,
// motor de IA, eliminar cuenta) llega en F6.
export function SettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { spacing } = useTheme();
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const scale = useSettingsStore((s) => s.readerFontScale);
  const setScale = useSettingsStore((s) => s.setReaderFontScale);
  const email = useSessionStore((s) => s.session?.email);
  const signOut = useSessionStore((s) => s.signOut);

  return (
    <ScreenTemplate header={{ title: es.settings.title }}>
      <View style={{ gap: spacing.md }}>
        <SectionHeader title={es.settings.appearance} />
        <AppText variant="label" color="secondary">
          {es.settings.theme}
        </AppText>
        <View style={{ flexDirection: 'row', gap: spacing.sm }} accessibilityRole="radiogroup">
          {THEME_MODES.map((m) => (
            <ThemeSwatch key={m} mode={m} label={es.settings.themes[m]} selected={theme === m} onPress={() => setTheme(m)} />
          ))}
        </View>
        <AppText variant="label" color="secondary">
          {es.settings.fontSize}
        </AppText>
        <FontSizeStepper value={scale} onChange={setScale} />
        <Divider />
      </View>

      <View style={{ gap: spacing.sm }}>
        <SectionHeader title={es.settings.aiEngine} />
        <SettingRow title={es.settings.aiEngine} description={es.settings.aiEngineValue} onPress={() => navigation.navigate('AIEngine')} />
        <Divider />
      </View>

      <View style={{ gap: spacing.sm }}>
        <SectionHeader title={es.settings.account} />
        {email ? (
          <AppText variant="body" color="secondary">
            {es.settings.signedInAs(email)}
          </AppText>
        ) : null}
        <SettingRow title={es.settings.accountRow} onPress={() => navigation.navigate('Account')} />
        <Button variant="secondary" label={es.settings.signOut} onPress={signOut} />
      </View>

      {__DEV__ ? (
        <View style={{ gap: spacing.sm }}>
          <Divider />
          <SettingRow title={es.settings.catalog} onPress={() => navigation.navigate('DevCatalog')} />
        </View>
      ) : null}
    </ScreenTemplate>
  );
}
