import React from 'react';
import { Alert, Linking, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { AppText } from '../../design-system/atoms/AppText';
import { Button } from '../../design-system/atoms/Button';
import { Chip } from '../../design-system/atoms/Chip';
import { Divider } from '../../design-system/atoms/Divider';
import { Spinner } from '../../design-system/atoms/Spinner';
import { Switch } from '../../design-system/atoms/Switch';
import { FontSizeStepper } from '../../design-system/molecules/FontSizeStepper';
import { SectionHeader } from '../../design-system/molecules/SectionHeader';
import { SettingRow } from '../../design-system/molecules/SettingRow';
import { SliderField } from '../../design-system/molecules/SliderField';
import { ThemeSwatch } from '../../design-system/molecules/ThemeSwatch';
import { VoiceOption } from '../../design-system/molecules/VoiceOption';
import { AppScreen } from '../shared/AppScreen';
import { useTheme } from '../../design-system/theme/useTheme';
import { THEME_MODES } from '../../design-system/tokens';
import { getContainer } from '../../data/container';
import { toCloudVoiceId } from '../../domain/ttsProposal';
import { es } from '../../i18n/es';
import type { AppStackParamList } from '../../navigation/types';
import { haptic } from '../../services/haptics';
import { performSignOut, syncBeforeSignOut } from '../../services/session/signOut';
import { speakAny } from '../../services/tts';
import { useSessionStore } from '../../state/sessionStore';
import { useSettingsStore } from '../../state/settingsStore';
import { useCloudVoices, useSpanishVoices } from './useVoices';

const DOSE_OPTIONS = [1.5, 2.5, 3.5] as const;
const formatFactor = (v: number) => `${v.toFixed(1)}×`;

// Abre la pantalla de voz del sistema (Android) para instalar más voces; si no existe, los ajustes de la app.
function openSystemVoiceSettings() {
  Linking.sendIntent('android.settings.TTS_SETTINGS').catch(() => Linking.openSettings().catch(() => undefined));
}

export function SettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { spacing, reduceMotion } = useTheme();
  const s = useSettingsStore();
  const email = useSessionStore((st) => st.session?.email);
  const voices = useSpanishVoices();

  // En live se envía lo pendiente antes de salir; si quedan sesiones sin sincronizar se advierte.
  const requestSignOut = async () => {
    const { pending } = await syncBeforeSignOut();
    if (pending === 0) return void performSignOut();
    Alert.alert(es.settings.signOutPendingTitle, es.settings.signOutPendingBody(pending), [
      { text: es.common.cancel, style: 'cancel' },
      { text: es.settings.signOutAnyway, style: 'destructive', onPress: () => void performSignOut() },
    ]);
  };

  const cloudGateway = getContainer().tts;
  const cloudVoices = useCloudVoices();

  const testVoice = (voiceId: string | null) =>
    speakAny(es.settings.voiceTestSample, { voiceId, rate: s.speechRate, pitch: s.speechPitch });

  return (
    <AppScreen header={{ title: es.settings.title }}>
      {/* Apariencia */}
      <View style={{ gap: spacing.md }}>
        <SectionHeader title={es.settings.appearance} />
        <AppText variant="label" color="secondary">
          {es.settings.theme}
        </AppText>
        <View style={{ flexDirection: 'row', gap: spacing.sm }} accessibilityRole="radiogroup">
          {THEME_MODES.map((m) => (
            <ThemeSwatch key={m} mode={m} label={es.settings.themes[m]} selected={s.theme === m} onPress={() => s.setTheme(m)} />
          ))}
        </View>
        <AppText variant="label" color="secondary">
          {es.settings.fontSize}
        </AppText>
        <FontSizeStepper value={s.readerFontScale} onChange={s.setReaderFontScale} />
        <Divider />
      </View>

      {/* Lectura */}
      <View style={{ gap: spacing.sm }}>
        <SectionHeader title={es.settings.reading} />
        <AppText variant="label" color="secondary">
          {es.settings.doseDuration}
        </AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {DOSE_OPTIONS.map((m) => (
            <Chip key={m} label={es.settings.doseMinutes(m)} selected={s.targetDoseMinutes === m} onPress={() => s.update({ targetDoseMinutes: m })} />
          ))}
        </View>
        <SettingRow
          title={es.settings.quiz}
          description={es.settings.quizHint}
          control={<Switch value={s.quizEnabled} onValueChange={(v) => s.update({ quizEnabled: v })} accessibilityLabel={es.settings.quiz} />}
        />
        <Divider />
      </View>

      {/* Voz: solo voces reales del sistema en español */}
      <View style={{ gap: spacing.sm }}>
        <SectionHeader title={es.settings.voice} />
        {voices.isLoading ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Spinner accessibilityLabel={es.settings.voicesLoading} />
            <AppText variant="caption" color="secondary">
              {es.settings.voicesLoading}
            </AppText>
          </View>
        ) : voices.data && voices.data.length > 0 ? (
          <View accessibilityRole="radiogroup">
            <VoiceOption
              name={es.settings.voiceSystemDefault}
              language="es"
              selected={s.voiceId === null}
              onSelect={() => s.update({ voiceId: null })}
              onPreview={() => testVoice(null)}
            />
            {voices.data.map((v) => (
              <VoiceOption
                key={v.id}
                name={v.name}
                language={v.language}
                selected={s.voiceId === v.id}
                onSelect={() => s.update({ voiceId: v.id })}
                onPreview={() => testVoice(v.id)}
              />
            ))}
          </View>
        ) : (
          <AppText variant="caption" color="secondary">
            {es.settings.voicesEmpty}
          </AppText>
        )}
        {/* Voces de alta calidad del servidor (temporal): masculinas y femeninas reales */}
        <AppText variant="label" color="secondary" accessibilityRole="header">
          {es.settings.cloudVoices}
        </AppText>
        {!cloudGateway ? (
          <AppText variant="caption" color="muted">
            {es.settings.cloudVoicesMock}
          </AppText>
        ) : cloudVoices.isLoading ? (
          <AppText variant="caption" color="muted">
            {es.settings.cloudVoicesLoading}
          </AppText>
        ) : cloudVoices.data && cloudVoices.data.length > 0 ? (
          <View accessibilityRole="radiogroup">
            {cloudVoices.data.map((v) => {
              const id = toCloudVoiceId(v.id);
              return (
                <VoiceOption
                  key={id}
                  name={v.name}
                  language={`${v.language} · ${es.settings.genders[v.gender]}`}
                  selected={s.voiceId === id}
                  onSelect={() => s.update({ voiceId: id })}
                  onPreview={() => testVoice(id)}
                />
              );
            })}
          </View>
        ) : (
          <AppText variant="caption" color="muted">
            {es.settings.cloudVoicesUnavailable}
          </AppText>
        )}
        <AppText variant="caption" color="muted">
          {es.settings.voicesHint}
        </AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          <Button variant="secondary" icon="settings-outline" label={es.settings.voiceSystemSettings} onPress={openSystemVoiceSettings} />
          <Button variant="ghost" icon="refresh" label={es.settings.voiceRefresh} onPress={() => void voices.refetch()} />
        </View>
        <SliderField label={es.settings.voiceRate} value={s.speechRate} min={0.5} max={2} step={0.1} format={formatFactor} onChange={(v) => s.update({ speechRate: v })} />
        <SliderField label={es.settings.voicePitch} value={s.speechPitch} min={0.5} max={2} step={0.1} format={formatFactor} onChange={(v) => s.update({ speechPitch: v })} />
        <Button variant="secondary" icon="play" label={es.settings.voiceTest} onPress={() => testVoice(s.voiceId)} />
        <Divider />
      </View>

      {/* Accesibilidad */}
      <View style={{ gap: spacing.sm }}>
        <SectionHeader title={es.settings.accessibility} />
        <SettingRow
          title={es.settings.haptics}
          description={es.settings.hapticsHint}
          control={
            <Switch
              value={s.hapticsEnabled}
              onValueChange={(v) => {
                s.update({ hapticsEnabled: v });
                void haptic('light', v); // al activarlo se siente de inmediato
              }}
              accessibilityLabel={es.settings.haptics}
            />
          }
        />
        <SettingRow title={es.settings.reduceMotion} description={reduceMotion ? es.settings.reduceMotionOn : es.settings.reduceMotionOff} />
        <Divider />
      </View>

      {/* Motor de IA */}
      <View style={{ gap: spacing.sm }}>
        <SectionHeader title={es.settings.aiEngine} />
        <SettingRow
          title={es.settings.aiEngine}
          description={s.aiProvider === 'focusread' ? es.settings.aiEngineValue : s.aiProvider}
          onPress={() => navigation.navigate('AIEngine')}
        />
        <Divider />
      </View>

      {/* Cuenta */}
      <View style={{ gap: spacing.sm }}>
        <SectionHeader title={es.settings.account} />
        {email ? (
          <AppText variant="body" color="secondary">
            {es.settings.signedInAs(email)}
          </AppText>
        ) : null}
        <SettingRow title={es.settings.accountRow} onPress={() => navigation.navigate('Account')} />
        <Button variant="secondary" label={es.settings.signOut} onPress={() => void requestSignOut()} />
      </View>

      {__DEV__ ? (
        <View style={{ gap: spacing.sm }}>
          <Divider />
          <SettingRow title={es.settings.catalog} onPress={() => navigation.navigate('DevCatalog')} />
        </View>
      ) : null}
    </AppScreen>
  );
}
