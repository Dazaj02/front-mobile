import React, { forwardRef } from 'react';
import { TextInput, View } from 'react-native';

import { AppText } from '../atoms/AppText';
import { TextInputBase, type TextInputBaseProps } from '../atoms/TextInputBase';
import { useTheme } from '../theme/useTheme';

export interface FormFieldProps extends Omit<TextInputBaseProps, 'error' | 'accessibilityLabel'> {
  label: string;
  helpText?: string;
  errorText?: string;
  trailing?: React.ReactNode; // p. ej. botón mostrar/ocultar
}

export const FormField = forwardRef<TextInput, FormFieldProps>(function FormField(
  { label, helpText, errorText, trailing, ...inputProps },
  ref,
) {
  const { spacing, sizes } = useTheme();
  const hasError = Boolean(errorText);
  return (
    <View style={{ gap: spacing.xs }}>
      <AppText variant="label" color="secondary">
        {label}
      </AppText>
      <View>
        <TextInputBase
          ref={ref}
          {...inputProps}
          error={hasError}
          insetRight={trailing ? sizes.touchMin : undefined}
          accessibilityLabel={label}
          accessibilityHint={hasError ? errorText : helpText}
        />
        {trailing ? (
          <View
            style={{
              position: 'absolute',
              right: spacing.xs,
              top: 0,
              bottom: 0,
              minWidth: sizes.touchMin,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {trailing}
          </View>
        ) : null}
      </View>
      {hasError ? (
        <AppText variant="caption" color="danger" accessibilityLiveRegion="polite">
          {errorText}
        </AppText>
      ) : helpText ? (
        <AppText variant="caption" color="muted">
          {helpText}
        </AppText>
      ) : null}
    </View>
  );
});
