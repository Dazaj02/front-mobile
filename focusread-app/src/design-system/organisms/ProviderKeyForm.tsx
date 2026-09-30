import React from 'react';
import { KeyboardAvoidingView, View } from 'react-native';

import { AppText } from '../atoms/AppText';
import { Button } from '../atoms/Button';
import { Chip } from '../atoms/Chip';
import { Banner } from '../molecules/Banner';
import { PasswordField } from '../molecules/PasswordField';
import { useTheme } from '../theme/useTheme';

export interface ProviderOption {
  id: string;
  name: string;
}
export interface ModelOption {
  id: string;
  label: string;
}

export interface ProviderKeyFormProps {
  providers: readonly ProviderOption[];
  provider: string;
  onProviderChange: (id: string) => void;
  models: readonly ModelOption[];
  model: string | null;
  onModelChange: (id: string) => void;
  requiresKey: boolean; // false para "focusread" (incluido)
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  hasSavedKey: boolean;
  onSaveKey: () => void;
  onDeleteKey: () => void;
  onTest: () => void;
  testing?: boolean;
  testMessage?: { ok: boolean; text: string };
  testDisabledReason?: string; // "Disponible con el servidor" / sin conexión
  usageText?: string; // "12 de 20 usos hoy"
}

export function ProviderKeyForm(props: ProviderKeyFormProps) {
  const { spacing } = useTheme();
  const {
    providers,
    provider,
    onProviderChange,
    models,
    model,
    onModelChange,
    requiresKey,
    apiKey,
    onApiKeyChange,
    hasSavedKey,
    onSaveKey,
    onDeleteKey,
    onTest,
    testing = false,
    testMessage,
    testDisabledReason,
    usageText,
  } = props;

  return (
    // Va dentro de ScreenTemplate (que ya desplaza): sin ScrollView propio para no anidar scrolls.
    <KeyboardAvoidingView behavior="padding">
      <View style={{ gap: spacing.lg }}>
        <View style={{ gap: spacing.xs }}>
          <AppText variant="label" color="secondary">
            Proveedor
          </AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {providers.map((p) => (
              <Chip key={p.id} label={p.name} selected={p.id === provider} onPress={() => onProviderChange(p.id)} />
            ))}
          </View>
        </View>

        {models.length > 0 ? (
          <View style={{ gap: spacing.xs }}>
            <AppText variant="label" color="secondary">
              Modelo
            </AppText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {models.map((m) => (
                <Chip key={m.id} label={m.label} selected={m.id === model} onPress={() => onModelChange(m.id)} />
              ))}
            </View>
          </View>
        ) : null}

        {usageText ? (
          <AppText variant="caption" color="secondary">
            {usageText}
          </AppText>
        ) : null}

        {requiresKey ? (
          <View style={{ gap: spacing.md }}>
            <PasswordField
              label="Tu API key"
              value={apiKey}
              onChangeText={onApiKeyChange}
              placeholder={hasSavedKey ? 'Key guardada en este dispositivo' : 'Pega tu key'}
              helpText="Se guarda solo en este dispositivo y nunca se sube a tu cuenta."
            />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              <Button label="Guardar key" onPress={onSaveKey} disabled={apiKey.trim().length === 0} />
              {hasSavedKey ? <Button variant="secondary" label="Borrar key" onPress={onDeleteKey} /> : null}
            </View>
          </View>
        ) : null}

        {/* El proveedor incluido no tiene key propia que probar. */}
        {requiresKey ? (
          <>
            <Button
              variant="secondary"
              label="Probar conexión"
              loading={testing}
              disabled={Boolean(testDisabledReason) || !hasSavedKey}
              onPress={onTest}
            />
            {testDisabledReason ? <Banner tone="info" message={testDisabledReason} /> : null}
          </>
        ) : null}
        {testMessage ? <Banner tone={testMessage.ok ? 'info' : 'error'} message={testMessage.text} /> : null}
      </View>
    </KeyboardAvoidingView>
  );
}
