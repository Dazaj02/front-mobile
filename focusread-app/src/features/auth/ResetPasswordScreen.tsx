import React, { useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AuthForm } from '../../design-system/organisms/AuthForm';
import { AuthTemplate } from '../../design-system/templates/AuthTemplate';
import { getContainer } from '../../data/container';
import { errorMessage, es } from '../../i18n/es';
import type { AuthStackParamList } from '../../navigation/types';
import { AuthBrand } from './AuthBrand';
import { ResetSchema, validate, type FieldErrors } from './schemas';

// Se abre desde el enlace focusread://auth/reset del correo de recuperación.
export function ResetPasswordScreen({ navigation }: NativeStackScreenProps<AuthStackParamList, 'ResetPassword'>) {
  const [values, setValues] = useState({ email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState<FieldErrors & { form?: string }>({});
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const result = validate(ResetSchema, values);
    if (result.errors) return setErrors(result.errors);
    setErrors({});
    setLoading(true);
    try {
      await getContainer().auth.updatePassword(result.data.password);
      navigation.replace('Login', { notice: 'passwordUpdated' });
    } catch (e) {
      setErrors({ form: errorMessage(e) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthTemplate brand={<AuthBrand />}>
      <AuthForm
        variant="reset"
        title={es.auth.resetTitle}
        submitLabel={es.auth.resetSubmit}
        values={values}
        errors={errors}
        loading={loading}
        onChange={(field, value) => setValues((v) => ({ ...v, [field]: value }))}
        onSubmit={submit}
      />
    </AuthTemplate>
  );
}
