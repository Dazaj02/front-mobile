import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import * as Linking from 'expo-linking';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppText } from '../../design-system/atoms/AppText';
import { Button } from '../../design-system/atoms/Button';
import { Spinner } from '../../design-system/atoms/Spinner';
import { AuthTemplate } from '../../design-system/templates/AuthTemplate';
import { useTheme } from '../../design-system/theme/useTheme';
import { getContainer } from '../../data/container';
import { errorMessage, es } from '../../i18n/es';
import type { AuthStackParamList } from '../../navigation/types';

// Destino de focusread://auth/callback: intercambia el código (PKCE en live) y continúa el flujo.
export function AuthCallbackScreen({ navigation, route }: NativeStackScreenProps<AuthStackParamList, 'AuthCallback'>) {
  const { spacing } = useTheme();
  const [error, setError] = useState<string | null>(null);
  const code = route.params?.code;

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const url = Linking.createURL('auth/callback', { queryParams: code ? { code } : {} });
        const result = await getContainer().auth.handleAuthCallback(url);
        if (!active) return;
        if (result === 'verified') navigation.replace('Login', { notice: 'verified' });
        else if (result === 'recovery') navigation.replace('ResetPassword');
        else setError(es.auth.callbackInvalid);
      } catch (e) {
        if (active) setError(errorMessage(e));
      }
    })();
    return () => {
      active = false;
    };
  }, [code, navigation]);

  return (
    <AuthTemplate>
      <View style={{ alignItems: 'center', gap: spacing.lg }}>
        {error ? (
          <>
            <AppText variant="body" color="danger" align="center" accessibilityRole="alert">
              {error}
            </AppText>
            <Button label={es.auth.backToLogin} onPress={() => navigation.replace('Login')} />
          </>
        ) : (
          <>
            <Spinner size="lg" accessibilityLabel={es.auth.callbackWorking} />
            <AppText variant="body" color="secondary" align="center">
              {es.auth.callbackWorking}
            </AppText>
          </>
        )}
      </View>
    </AuthTemplate>
  );
}
