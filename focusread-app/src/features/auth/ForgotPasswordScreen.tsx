import React, { useState } from 'react';
import * as Linking from 'expo-linking';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button } from '../../design-system/atoms/Button';
import { AuthForm } from '../../design-system/organisms/AuthForm';
import { AuthTemplate } from '../../design-system/templates/AuthTemplate';
import { getContainer } from '../../data/container';
import { errorMessage, es } from '../../i18n/es';
import type { AuthStackParamList } from '../../navigation/types';
import { AuthBrand } from './AuthBrand';
import { ForgotSchema, validate, type FieldErrors } from './schemas';

export function ForgotPasswordScreen({ navigation }: NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>) {
  const [values, setValues] = useState({ email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState<FieldErrors & { form?: string }>({});
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    const result = validate(ForgotSchema, values);
    if (result.errors) return setErrors(result.errors);
    setErrors({});
    setLoading(true);
    try {
      await getContainer().auth.requestPasswordReset(result.data.email);
      setSent(true);
    } catch (e) {
      setErrors({ form: errorMessage(e) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthTemplate brand={<AuthBrand />}>
      <AuthForm
        variant="recover"
        title={es.auth.forgotTitle}
        submitLabel={es.auth.forgotSubmit}
        values={values}
        errors={errors}
        notice={sent ? es.auth.forgotSent : undefined}
        loading={loading}
        onChange={(field, value) => setValues((v) => ({ ...v, [field]: value }))}
        onSubmit={submit}
        links={[{ label: es.auth.backToLogin, onPress: () => navigation.navigate('Login') }]}
      />
      {__DEV__ && sent ? (
        <Button variant="ghost" label={es.auth.simulateLink} onPress={() => Linking.openURL(Linking.createURL('auth/reset'))} />
      ) : null}
    </AuthTemplate>
  );
}
