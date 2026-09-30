import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usePreventScreenCapture } from 'expo-screen-capture';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Spinner } from '../../design-system/atoms/Spinner';
import { ErrorState } from '../../design-system/organisms/ErrorState';
import { ProviderKeyForm } from '../../design-system/organisms/ProviderKeyForm';
import { ScreenTemplate } from '../../design-system/templates/ScreenTemplate';
import { getContainer } from '../../data/container';
import { ByokProviderIdSchema } from '../../domain/contract';
import type { ByokProviderId } from '../../domain/ports';
import { errorMessage, es } from '../../i18n/es';
import type { AppStackParamList } from '../../navigation/types';
import { useSettingsStore } from '../../state/settingsStore';

const asByok = (id: string): ByokProviderId | null => {
  const parsed = ByokProviderIdSchema.safeParse(id);
  return parsed.success ? parsed.data : null;
};

// Proveedor, modelo y API key propia. La key se guarda SOLO en SecureStore (nunca en SQLite,
// AsyncStorage ni Supabase) y esta pantalla impide capturas y grabaciones.
export function AIEngineScreen({ navigation }: NativeStackScreenProps<AppStackParamList, 'AIEngine'>) {
  usePreventScreenCapture();
  const qc = useQueryClient();
  const provider = useSettingsStore((s) => s.aiProvider);
  const model = useSettingsStore((s) => s.aiModel);
  const update = useSettingsStore((s) => s.update);

  const [apiKey, setApiKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | undefined>();

  const providers = useQuery({ queryKey: ['providers'], queryFn: () => getContainer().ai.listProviders() });
  const byok = asByok(provider);
  const hasKey = useQuery({
    queryKey: ['aiKeyExists', provider],
    queryFn: async () => (byok ? (await getContainer().secrets.getAIKey(byok)) !== null : false),
  });
  const usage = useQuery({
    queryKey: ['usage'],
    queryFn: () => getContainer().ai.usage(),
    enabled: provider === 'focusread' && getContainer().mode === 'live',
  });

  const info = providers.data?.find((p) => p.id === provider);
  const refreshKeyState = () => qc.invalidateQueries({ queryKey: ['aiKeyExists', provider] });

  const selectProvider = (id: string) => {
    const next = providers.data?.find((p) => p.id === id);
    if (!next) return;
    setApiKey('');
    setMessage(undefined);
    update({ aiProvider: next.id, aiModel: next.defaultModel });
  };

  const saveKey = async () => {
    if (!byok) return;
    await getContainer().secrets.setAIKey(byok, apiKey);
    setApiKey(''); // la key ya no vive en memoria de la pantalla
    await refreshKeyState();
    setMessage({ ok: true, text: es.aiEngine.keySaved });
  };

  const deleteKey = async () => {
    if (!byok) return;
    await getContainer().secrets.deleteAIKey(byok);
    await refreshKeyState();
    setMessage({ ok: true, text: es.aiEngine.keyDeleted });
  };

  const test = async () => {
    if (!byok) return;
    setTesting(true);
    setMessage(undefined);
    try {
      const { ai, secrets } = getContainer();
      const key = await secrets.getAIKey(byok);
      await ai.testProvider(byok, model ?? undefined, key ?? '');
      setMessage({ ok: true, text: es.aiEngine.testOk });
    } catch (e) {
      setMessage({ ok: false, text: errorMessage(e) });
    } finally {
      setTesting(false);
    }
  };

  let body: React.ReactNode;
  if (providers.isLoading) body = <Spinner size="lg" />;
  else if (providers.isError || !providers.data) body = <ErrorState title={es.aiEngine.loadFailed} onRetry={() => void providers.refetch()} />;
  else {
    body = (
      <ProviderKeyForm
        providers={providers.data.map((p) => ({ id: p.id, name: p.name }))}
        provider={provider}
        onProviderChange={selectProvider}
        models={info?.models ?? []}
        model={model ?? info?.defaultModel ?? null}
        onModelChange={(id) => update({ aiModel: id })}
        requiresKey={info?.requiresUserKey ?? false}
        apiKey={apiKey}
        onApiKeyChange={setApiKey}
        hasSavedKey={hasKey.data ?? false}
        onSaveKey={() => void saveKey()}
        onDeleteKey={() => void deleteKey()}
        onTest={() => void test()}
        testing={testing}
        testMessage={message}
        // En modo mock no hay servidor que valide la key.
        testDisabledReason={getContainer().mode === 'mock' ? es.aiEngine.testServerOnly : undefined}
        usageText={usage.data && usage.data.limit > 0 ? es.aiEngine.usage(usage.data.used, usage.data.limit) : undefined}
      />
    );
  }

  return <ScreenTemplate header={{ title: es.aiEngine.title, onBack: () => navigation.goBack() }}>{body}</ScreenTemplate>;
}
