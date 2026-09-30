import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ImportSheet, type ImportDuration, type ImportMode, type ImportStatus } from '../../design-system/organisms/ImportSheet';
import { SheetTemplate } from '../../design-system/templates/SheetTemplate';
import { getContainer } from '../../data/container';
import type { ProcessArticleRequest } from '../../domain/contract';
import type { ByokProviderId } from '../../domain/ports';
import { errorMessage, es } from '../../i18n/es';
import type { AppStackParamList } from '../../navigation/types';
import { haptic } from '../../services/haptics';
import { useSettingsStore } from '../../state/settingsStore';
import { articleProgressKey, articlesKey } from './useLibraryData';

// Crear artículos SIEMPRE pasa por ai.process (la API en live; el fragmentador local en mock):
// la app nunca inserta artículos por su cuenta.
export function ImportScreen({ navigation }: NativeStackScreenProps<AppStackParamList, 'Import'>) {
  const qc = useQueryClient();
  const provider = useSettingsStore((s) => s.aiProvider);
  const model = useSettingsStore((s) => s.aiModel);
  const defaultDuration = useSettingsStore((s) => s.targetDoseMinutes);

  const [mode, setMode] = useState<ImportMode>('text');
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [duration, setDuration] = useState<ImportDuration>(defaultDuration);
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [error, setError] = useState<string | undefined>();
  const [degraded, setDegraded] = useState(false);

  const providers = useQuery({ queryKey: ['providers'], queryFn: () => getContainer().ai.listProviders() });
  const providerLabel = providers.data?.find((p) => p.id === provider)?.name ?? es.settings.aiEngineValue;

  const close = () => navigation.goBack();

  const submit = async () => {
    setStatus('processing');
    setError(undefined);
    try {
      const { ai, secrets } = getContainer();
      const key = provider === 'focusread' ? undefined : ((await secrets.getAIKey(provider as ByokProviderId)) ?? undefined);
      const request: ProcessArticleRequest = {
        source: mode === 'text' ? { type: 'text', text: text.trim() } : { type: 'url', url: url.trim() },
        targetDoseMinutes: duration,
        provider,
        ...(model ? { model } : {}),
        includeQuiz: true,
      };
      const { warnings } = await ai.process(request, key);
      await Promise.all([qc.invalidateQueries({ queryKey: articlesKey }), qc.invalidateQueries({ queryKey: articleProgressKey })]);
      void haptic('success');
      if (warnings.includes('AI_ENRICHMENT_DEGRADED')) {
        setDegraded(true);
        setStatus('idle');
      } else {
        close();
      }
    } catch (e) {
      setStatus('error');
      setError(errorMessage(e));
    }
  };

  return (
    <SheetTemplate visible title={es.importSheet.title} onClose={close}>
      <ImportSheet
        mode={mode}
        onModeChange={setMode}
        text={text}
        onTextChange={setText}
        url={url}
        onUrlChange={setUrl}
        duration={duration}
        onDurationChange={setDuration}
        providerLabel={providerLabel}
        status={status}
        errorMessage={error}
        onSubmit={submit}
        completed={degraded}
        completedMessage={es.importSheet.created}
        warningMessage={degraded ? es.importSheet.degraded : undefined}
        doneLabel={es.importSheet.done}
        onDone={close}
      />
    </SheetTemplate>
  );
}
