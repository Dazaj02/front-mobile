import React from 'react';
import { Pressable, View } from 'react-native';

import { useTheme } from '../theme/useTheme';
import { borderWidth } from '../tokens';
import { AppText, type TextColor } from './AppText';
import { Icon, type IconName } from './Icon';
import { Spinner } from './Spinner';

export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'inverse'; // inverse: sobre superficies de tinta (bg.inverse)
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName;
  iconPosition?: 'start' | 'end'; // 'end' para acciones de avance ("Seguir →")
  accessibilityHint?: string;
}

export function Button({
  variant = 'primary',
  label,
  onPress,
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'start',
  accessibilityHint,
}: ButtonProps) {
  const { components: c, spacing } = useTheme();
  const b = c.button;
  const inactive = disabled || loading;
  const fg: TextColor = { primary: 'onAccent', secondary: 'primary', ghost: 'accent', inverse: 'primary' }[variant] as TextColor;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: b.height,
        borderRadius: variant === 'inverse' ? b.pillRadius : b.radius,
        paddingHorizontal: b.paddingX,
        paddingVertical: spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? b.disabledOpacity : 1,
        backgroundColor:
          variant === 'primary'
            ? pressed
              ? b.primary.bgPressed
              : b.primary.bg
            : variant === 'secondary'
              ? b.secondary.bg
              : variant === 'inverse'
                ? b.inverse.bg
                : 'transparent',
        borderWidth: variant === 'secondary' ? borderWidth.thin : 0,
        borderColor: b.secondary.border,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm }}>
        {loading ? <Spinner onAccent={variant === 'primary'} /> : icon && iconPosition === 'start' ? <Icon name={icon} size="sm" color={fg} /> : null}
        <AppText variant="label" color={fg} align="center">
          {label}
        </AppText>
        {!loading && icon && iconPosition === 'end' ? <Icon name={icon} size="sm" color={fg} /> : null}
      </View>
    </Pressable>
  );
}
