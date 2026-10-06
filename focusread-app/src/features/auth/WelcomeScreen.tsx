import React, { useState } from 'react';
import { View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppText } from '../../design-system/atoms/AppText';
import { Button } from '../../design-system/atoms/Button';
import { Banner } from '../../design-system/molecules/Banner';
import { AuthTemplate } from '../../design-system/templates/AuthTemplate';
import { useTheme } from '../../design-system/theme/useTheme';
import { getContainer } from '../../data/container';
import { errorMessage, es } from '../../i18n/es';
import type { AuthStackParamList } from '../../navigation/types';
import { AuthBrand } from './AuthBrand';

export function WelcomeScreen({ navigation }: NativeStackScreenProps<AuthStackParamList, 'Welcome'>) {
  const { spacing } = useTheme();
  const [error, setError] = useState<string | null>(null);
  // Solo existe en desarrollo (el contenedor no lo define en release).
  const devSignIn = getContainer().devSignIn;

  return (
    <AuthTemplate brand={<AuthBrand />}>
      <View style={{ gap: spacing.sm }}>
        <AppText variant="headline" align="center">
          {es.auth.welcomeTitle}
        </AppText>
        <AppText variant="body" color="secondary" align="center">
          {es.auth.welcomeSubtitle}
        </AppText>
      </View>
      {error ? <Banner tone="error" message={error} /> : null}
      <View style={{ gap: spacing.md }}>
        <Button label={es.auth.goLogin} onPress={() => navigation.navigate('Login')} />
        <Button variant="secondary" label={es.auth.goRegister} onPress={() => navigation.navigate('Register')} />
        {__DEV__ && devSignIn ? (
          <Button variant="ghost" label={es.auth.demo} onPress={() => devSignIn().catch((e) => setError(errorMessage(e)))} />
        ) : null}
      </View>
    </AuthTemplate>
  );
}
