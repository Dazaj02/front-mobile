import React from 'react';
import { ScrollView, View } from 'react-native';

import { AppText } from '../atoms/AppText';
import { Button } from '../atoms/Button';
import { Chip } from '../atoms/Chip';
import { TextInputBase } from '../atoms/TextInputBase';
import { Banner } from '../molecules/Banner';
import { FormField } from '../molecules/FormField';
import { useTheme } from '../theme/useTheme';

export type ImportMode = 'text' | 'url';
export type ImportDuration = 1.5 | 2.5 | 3.5;
export type ImportStatus = 'idle' | 'processing' | 'error';

export interface ImportSheetProps {
  mode: ImportMode;
  onModeChange: (mode: ImportMode) => void;
  text: string;
  onTextChange: (text: string) => void;
  url: string;
  onUrlChange: (url: string) => void;
  duration: ImportDuration;
  onDurationChange: (d: ImportDuration) => void;
  providerLabel: string; // "FocusRead (incluido)"
  status: ImportStatus;
  errorMessage?: string;
  warningMessage?: string; // AI_ENRICHMENT_DEGRADED
  disabledReason?: string; // p. ej. "Requiere conexión"
  minTextLength?: number;
  onSubmit: () => void;
}

const DURATIONS: readonly ImportDuration[] = [1.5, 2.5, 3.5];

export function ImportSheet({
  mode,
  onModeChange,
  text,
  onTextChange,
  url,
  onUrlChange,
  duration,
  onDurationChange,
  providerLabel,
  status,
  errorMessage,
  warningMessage,
  disabledReason,
  minTextLength = 300,
  onSubmit,
}: ImportSheetProps) {
  const { spacing } = useTheme();
  const processing = status === 'processing';
  const textTooShort = mode === 'text' && text.trim().length < minTextLength;
  const urlEmpty = mode === 'url' && url.trim().length === 0;
  const blocked = Boolean(disabledReason) || processing || textTooShort || urlEmpty;

  return (
    // El teclado lo gestiona el SheetTemplate que contiene esta hoja (un solo KeyboardAvoidingView).
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: spacing.lg }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }} accessibilityRole="tablist">
          <Chip label="Texto" selected={mode === 'text'} onPress={() => onModeChange('text')} />
          <Chip label="Enlace" selected={mode === 'url'} onPress={() => onModeChange('url')} />
        </View>

        {mode === 'text' ? (
          <View style={{ gap: spacing.xs }}>
            <AppText variant="label" color="secondary">
              Pega tu texto
            </AppText>
            <TextInputBase
              value={text}
              onChangeText={onTextChange}
              multiline
              textAlignVertical="top"
              accessibilityLabel="Texto a importar"
              placeholder="Pega aquí el texto que quieres leer"
              error={status === 'error'}
              minLines={8}
            />
            <AppText variant="caption" color={textTooShort ? 'warning' : 'muted'}>
              {text.trim().length} / mínimo {minTextLength} caracteres
            </AppText>
          </View>
        ) : (
          <FormField
            label="Enlace del artículo"
            value={url}
            onChangeText={onUrlChange}
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="https://"
            errorText={status === 'error' ? errorMessage : undefined}
          />
        )}

        <View style={{ gap: spacing.xs }}>
          <AppText variant="label" color="secondary">
            Duración de cada dosis
          </AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {DURATIONS.map((d) => (
              <Chip key={d} label={`${d} min`} selected={duration === d} onPress={() => onDurationChange(d)} />
            ))}
          </View>
        </View>

        <AppText variant="caption" color="secondary">
          Motor de IA: {providerLabel}
        </AppText>

        {status === 'error' && errorMessage && mode === 'text' ? <Banner tone="error" message={errorMessage} /> : null}
        {warningMessage ? <Banner tone="info" message={warningMessage} /> : null}
        {disabledReason ? <Banner tone="offline" message={disabledReason} /> : null}

        <Button label={processing ? 'Procesando…' : 'Crear dosis'} loading={processing} disabled={blocked && !processing} onPress={onSubmit} />
    </ScrollView>
  );
}
