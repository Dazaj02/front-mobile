import React from 'react';
import { View } from 'react-native';

import { AppText } from '../atoms/AppText';
import { Button } from '../atoms/Button';
import { Banner } from '../molecules/Banner';
import { FormField } from '../molecules/FormField';
import { PasswordField } from '../molecules/PasswordField';
import { useTheme } from '../theme/useTheme';

export type AuthVariant = 'login' | 'register' | 'recover' | 'reset';
export type AuthField = 'email' | 'password' | 'confirm';

export interface AuthLink {
  label: string;
  onPress: () => void;
}

export interface AuthFormProps {
  variant: AuthVariant;
  title: string;
  submitLabel: string;
  values: Record<AuthField, string>;
  errors?: Partial<Record<AuthField | 'form', string>>;
  loading?: boolean;
  onChange: (field: AuthField, value: string) => void;
  onSubmit: () => void;
  links?: readonly AuthLink[];
}

// Campos por variante: recover solo pide correo; reset pide contraseña nueva; register añade confirmación.
const FIELDS: Record<AuthVariant, readonly AuthField[]> = {
  login: ['email', 'password'],
  register: ['email', 'password', 'confirm'],
  recover: ['email'],
  reset: ['password', 'confirm'],
};

export function AuthForm({ variant, title, submitLabel, values, errors = {}, loading = false, onChange, onSubmit, links = [] }: AuthFormProps) {
  const { spacing } = useTheme();
  const fields = FIELDS[variant];
  const newPassword = variant === 'register' || variant === 'reset';
  return (
    <View style={{ gap: spacing.lg }}>
      <AppText variant="headline" accessibilityRole="header">
        {title}
      </AppText>
      {errors.form ? <Banner tone="error" message={errors.form} /> : null}
      {fields.includes('email') ? (
        <FormField
          label="Correo electrónico"
          value={values.email}
          onChangeText={(v) => onChange('email', v)}
          errorText={errors.email}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
        />
      ) : null}
      {fields.includes('password') ? (
        <PasswordField
          label={variant === 'reset' ? 'Nueva contraseña' : 'Contraseña'}
          value={values.password}
          onChangeText={(v) => onChange('password', v)}
          errorText={errors.password}
          helpText={newPassword ? 'Mínimo 8 caracteres, con letras y números' : undefined}
          autoComplete={newPassword ? 'password-new' : 'password'}
        />
      ) : null}
      {fields.includes('confirm') ? (
        <PasswordField
          label="Confirmar contraseña"
          value={values.confirm}
          onChangeText={(v) => onChange('confirm', v)}
          errorText={errors.confirm}
          autoComplete="password-new"
        />
      ) : null}
      <Button label={submitLabel} loading={loading} onPress={onSubmit} />
      {links.map((l) => (
        <Button key={l.label} variant="ghost" label={l.label} onPress={l.onPress} disabled={loading} />
      ))}
    </View>
  );
}
