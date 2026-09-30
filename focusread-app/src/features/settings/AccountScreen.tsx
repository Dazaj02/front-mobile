import React, { useState } from 'react';
import { View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppText } from '../../design-system/atoms/AppText';
import { Button } from '../../design-system/atoms/Button';
import { Banner } from '../../design-system/molecules/Banner';
import { FormField } from '../../design-system/molecules/FormField';
import { SectionHeader } from '../../design-system/molecules/SectionHeader';
import { AppScreen } from '../shared/AppScreen';
import { useTheme } from '../../design-system/theme/useTheme';
import { getContainer } from '../../data/container';
import { errorMessage, es } from '../../i18n/es';
import type { AppStackParamList } from '../../navigation/types';
import { useNetworkGate } from '../../services/network';
import { clearUserData } from '../../services/session/clearLocalData';
import { useSessionStore } from '../../state/sessionStore';

export function AccountScreen({ navigation }: NativeStackScreenProps<AppStackParamList, 'Account'>) {
  const { spacing } = useTheme();
  const email = useSessionStore((s) => s.session?.email);
  // Doble confirmación: 1) abrir el panel de eliminación  2) escribir ELIMINAR y confirmar.
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const gate = useNetworkGate(); // eliminar la cuenta requiere internet (solo en live)
  const armed = typed === es.account.deleteWord && !gate.blocked;

  const cancel = () => {
    setConfirming(false);
    setTyped('');
    setError(null);
  };

  const deleteAccount = async () => {
    if (!armed) return;
    setBusy(true);
    setError(null);
    try {
      // Primero el servidor: si falla, no se borra nada local.
      await getContainer().auth.deleteAccount();
      await clearUserData();
    } catch (e) {
      setError(`${es.account.deleteFailed} ${errorMessage(e)}`);
      setBusy(false);
    }
  };

  return (
    <AppScreen header={{ title: es.account.title, onBack: () => navigation.goBack() }}>
      <View style={{ gap: spacing.xs }}>
        <AppText variant="label" color="secondary">
          {es.account.email}
        </AppText>
        <AppText variant="body">{email ?? '—'}</AppText>
      </View>

      <View style={{ gap: spacing.md }}>
        <SectionHeader title={es.account.deleteTitle} />
        <AppText variant="body" color="secondary">
          {es.account.deleteWarning}
        </AppText>
        {!confirming ? (
          <Button variant="secondary" label={es.account.deleteStart} onPress={() => setConfirming(true)} />
        ) : (
          <View style={{ gap: spacing.md }}>
            <FormField
              label={es.account.deleteConfirmLabel}
              value={typed}
              onChangeText={setTyped}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            {gate.blocked ? <Banner tone="offline" message={es.offline.deleteRequires} /> : null}
            {error ? <Banner tone="error" message={error} /> : null}
            <Button label={es.account.deleteConfirm} disabled={!armed} loading={busy} onPress={() => void deleteAccount()} />
            <Button variant="ghost" label={es.account.deleteCancel} disabled={busy} onPress={cancel} />
          </View>
        )}
      </View>
    </AppScreen>
  );
}
