import React, { useState } from 'react';
import { View } from 'react-native';
import * as Linking from 'expo-linking';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppText } from '../../design-system/atoms/AppText';
import { Button } from '../../design-system/atoms/Button';
import { Icon } from '../../design-system/atoms/Icon';
import { Banner } from '../../design-system/molecules/Banner';
import { AuthTemplate } from '../../design-system/templates/AuthTemplate';
import { useTheme } from '../../design-system/theme/useTheme';
import { getContainer } from '../../data/container';
import { errorMessage, es } from '../../i18n/es';
import type { AuthStackParamList } from '../../navigation/types';
import { AuthBrand } from './AuthBrand';
import { useCooldown } from './useCooldown';

export const RESEND_COOLDOWN_SECONDS = 60;

export function VerifyEmailScreen({ navigation, route }: NativeStackScreenProps<AuthStackParamList, 'VerifyEmail'>) {
  const { spacing } = useTheme();
  const { email } = route.params;
  // El correo acaba de enviarse: el primer reenvío queda disponible tras 60 s.
  const cooldown = useCooldown(RESEND_COOLDOWN_SECONDS);
  const [message, setMessage] = useState<{ tone: 'info' | 'error'; text: string } | null>(null);
  const [sending, setSending] = useState(false);

  const resend = async () => {
    if (!cooldown.canAct || sending) return;
    setSending(true);
    try {
      await getContainer().auth.resendVerification(email);
      cooldown.start();
      setMessage({ tone: 'info', text: es.auth.resent });
    } catch (e) {
      setMessage({ tone: 'error', text: errorMessage(e) });
    } finally {
      setSending(false);
    }
  };

  return (
    <AuthTemplate brand={<AuthBrand />}>
      <View style={{ alignItems: 'center', gap: spacing.md }}>
        <Icon name="mail-outline" size="lg" color="accent" />
        <AppText variant="headline" align="center" accessibilityRole="header">
          {es.auth.verifyTitle}
        </AppText>
        <AppText variant="body" color="secondary" align="center">
          {es.auth.verifyBody(email)}
        </AppText>
      </View>
      {message ? <Banner tone={message.tone} message={message.text} /> : null}
      <View style={{ gap: spacing.md }}>
        <Button
          variant="secondary"
          label={cooldown.canAct ? es.auth.resend : es.auth.resendIn(cooldown.remaining)}
          disabled={!cooldown.canAct}
          loading={sending}
          onPress={resend}
        />
        {__DEV__ ? (
          <Button
            variant="ghost"
            label={es.auth.simulateLink}
            onPress={() => Linking.openURL(Linking.createURL('auth/callback', { queryParams: { code: 'mock' } }))}
          />
        ) : null}
        <Button variant="ghost" label={es.auth.backToLogin} onPress={() => navigation.navigate('Login')} />
      </View>
    </AuthTemplate>
  );
}
