import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ImportSheet, type ImportDuration, type ImportMode, type ImportStatus } from '../../design-system/organisms/ImportSheet';
import { SheetTemplate } from '../../design-system/templates/SheetTemplate';
import { PRESET_CATEGORIES } from '../../domain/categories';
import { useCategoryStore } from '../../state/categoryStore';
import { getContainer } from '../../data/container';
import type { ProcessArticleRequest } from '../../domain/contract';
import type { ByokProviderId } from '../../domain/ports';
import { errorMessage, es } from '../../i18n/es';
import type { AppStackParamList } from '../../navigation/types';
import { haptic } from '../../services/haptics';
import { useNetworkGate } from '../../services/network';
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
  const [category, setCategory] = useState<string | null>(null);
  const assignCategory = useCategoryStore((s) => s.assign);
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [error, setError] = useState<string | undefined>();
  const [degraded, setDegraded] = useState(false);

  const providers = useQuery({ queryKey: ['providers'], queryFn: () => getContainer().ai.listProviders() });
  const providerLabel = providers.data?.find((p) => p.id === provider)?.name ?? es.settings.aiEngineValue;

  const close = () => navigation.goBack();
  // Sin servidor (modo mock) solo funciona el proveedor incluido: se avisa antes de intentar.
  const mockNeedsServer = getContainer().mode === 'mock' && provider !== 'focusread';
  const gate = useNetworkGate(); // importar requiere conexión con el servidor (solo en live)

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
      const { article, warnings } = await ai.process(request, key);
      if (category) assignCategory(article.id, category);
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
        categories={PRESET_CATEGORIES}
        category={category}
        onCategoryChange={setCategory}
        categoryLabel={es.importSheet.category}
        categoryHint={es.importSheet.categoryHint}
        providerLabel={providerLabel}
        status={status}
        errorMessage={error}
        disabledReason={gate.blocked ? es.offline.importRequires : mockNeedsServer ? es.importSheet.mockNeedsServer : undefined}
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
