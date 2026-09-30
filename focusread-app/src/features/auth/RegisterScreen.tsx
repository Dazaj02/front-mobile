import React, { useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AuthForm } from '../../design-system/organisms/AuthForm';
import { AuthTemplate } from '../../design-system/templates/AuthTemplate';
import { getContainer } from '../../data/container';
import { errorMessage, es } from '../../i18n/es';
import type { AuthStackParamList } from '../../navigation/types';
import { AuthBrand } from './AuthBrand';
import { RegisterSchema, validate, type FieldErrors } from './schemas';

export function RegisterScreen({ navigation }: NativeStackScreenProps<AuthStackParamList, 'Register'>) {
  const [values, setValues] = useState({ email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState<FieldErrors & { form?: string }>({});
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const result = validate(RegisterSchema, values);
    if (result.errors) return setErrors(result.errors);
    setErrors({});
    setLoading(true);
    try {
      await getContainer().auth.signUp(result.data.email, result.data.password);
      navigation.navigate('VerifyEmail', { email: result.data.email });
    } catch (e) {
      setErrors({ form: errorMessage(e) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthTemplate brand={<AuthBrand />}>
      <AuthForm
        variant="register"
        title={es.auth.registerTitle}
        submitLabel={es.auth.registerSubmit}
        values={values}
        errors={errors}
        loading={loading}
        onChange={(field, value) => setValues((v) => ({ ...v, [field]: value }))}
        onSubmit={submit}
        links={[{ label: es.auth.haveAccountLink, onPress: () => navigation.navigate('Login') }]}
      />
    </AuthTemplate>
  );
}
