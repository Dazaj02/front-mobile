import React, { forwardRef, useState } from 'react';
import { TextInput, type TextInputProps } from 'react-native';

import { useTheme } from '../theme/useTheme';
import { borderWidth } from '../tokens';

export interface TextInputBaseProps extends Omit<TextInputProps, 'style'> {
  error?: boolean;
  disabled?: boolean;
  insetLeft?: number; // espacio reservado para iconos superpuestos
  insetRight?: number;
}

// Sin label: lo agrega FormField. Quien lo use suelto debe pasar accessibilityLabel.
export const TextInputBase = forwardRef<TextInput, TextInputBaseProps>(function TextInputBase(
  { error = false, disabled = false, insetLeft, insetRight, onFocus, onBlur, ...rest },
  ref,
) {
  const { components: c, typography, spacing, opacity } = useTheme();
  const [focused, setFocused] = useState(false);
  const input = c.input;
  return (
    <TextInput
      ref={ref}
      {...rest}
      editable={!disabled}
      placeholderTextColor={input.placeholder}
      accessibilityState={{ disabled }}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      style={[
        typography.body,
        {
          minHeight: input.height,
          borderRadius: input.radius,
          paddingLeft: insetLeft ?? spacing.lg,
          paddingRight: insetRight ?? spacing.lg,
          color: input.fg,
          backgroundColor: input.bg,
          borderWidth: error || focused ? input.focusBorderWidth : borderWidth.thin,
          borderColor: error ? input.errorBorder : focused ? input.focusBorder : input.border,
          opacity: disabled ? opacity.disabled : 1,
        },
      ]}
    />
  );
});
