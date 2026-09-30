import React, { forwardRef, useState } from 'react';
import { TextInput } from 'react-native';

import { IconButton } from '../atoms/IconButton';
import { FormField, type FormFieldProps } from './FormField';

export type PasswordFieldProps = Omit<FormFieldProps, 'trailing' | 'secureTextEntry'>;

export const PasswordField = forwardRef<TextInput, PasswordFieldProps>(function PasswordField(props, ref) {
  const [visible, setVisible] = useState(false);
  return (
    <FormField
      ref={ref}
      autoCapitalize="none"
      autoCorrect={false}
      {...props}
      secureTextEntry={!visible}
      trailing={
        <IconButton
          icon={visible ? 'eye-off-outline' : 'eye-outline'}
          accessibilityLabel={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          onPress={() => setVisible((v) => !v)}
          color="secondary"
        />
      }
    />
  );
});
