import React, { useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AuthForm } from '../../design-system/organisms/AuthForm';
import { AuthTemplate } from '../../design-system/templates/AuthTemplate';
import { getContainer } from '../../data/container';
import { errorMessage, es } from '../../i18n/es';
import { isAppError } from '../../lib/errors';
import type { AuthStackParamList } from '../../navigation/types';
import { AuthBrand } from './AuthBrand';
import { LoginSchema, validate, type FieldErrors } from './schemas';

export function LoginScreen({ navigation, route }: NativeStackScreenProps<AuthStackParamList, 'Login'>) {
  const [values, setValues] = useState({ email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState<FieldErrors & { form?: string }>({});
  const [loading, setLoading] = useState(false);
  const notice = route.params?.notice;

  const submit = async () => {
    const result = validate(LoginSchema, values);
    if (result.errors) return setErrors(result.errors);
    setErrors({});
    setLoading(true);
    try {
      // Al iniciar sesión, sessionStore cambia y RootNavigator muestra la app.
      await getContainer().auth.signIn(result.data.email, result.data.password);
    } catch (e) {
      setErrors({ form: errorMessage(e) });
      if (isAppError(e) && e.code === 'EMAIL_NOT_CONFIRMED') navigation.navigate('VerifyEmail', { email: result.data.email });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthTemplate brand={<AuthBrand />}>
      <AuthForm
        variant="login"
        title={es.auth.loginTitle}
        submitLabel={es.auth.loginSubmit}
        values={values}
        errors={errors}
        notice={notice === 'verified' ? es.auth.verifiedNotice : notice === 'passwordUpdated' ? es.auth.passwordUpdatedNotice : undefined}
        loading={loading}
        onChange={(field, value) => setValues((v) => ({ ...v, [field]: value }))}
        onSubmit={submit}
        links={[
          { label: es.auth.forgotLink, onPress: () => navigation.navigate('ForgotPassword') },
          { label: es.auth.noAccountLink, onPress: () => navigation.navigate('Register') },
        ]}
      />
    </AuthTemplate>
  );
}
