import React from 'react';
import { Pressable, View } from 'react-native';

import { useTheme } from '../theme/useTheme';
import { borderWidth } from '../tokens';
import { AppText, type TextColor } from './AppText';
import { Icon, type IconName } from './Icon';
import { Spinner } from './Spinner';

export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost';
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName;
  accessibilityHint?: string;
}

export function Button({
  variant = 'primary',
  label,
  onPress,
  loading = false,
  disabled = false,
  icon,
  accessibilityHint,
}: ButtonProps) {
  const { components: c, spacing } = useTheme();
  const b = c.button;
  const inactive = disabled || loading;
  const fg: TextColor = variant === 'primary' ? 'onAccent' : variant === 'secondary' ? 'primary' : 'accent';

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
        borderRadius: b.radius,
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
              : 'transparent',
        borderWidth: variant === 'secondary' ? borderWidth.thin : 0,
        borderColor: b.secondary.border,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm }}>
        {loading ? <Spinner onAccent={variant === 'primary'} /> : icon ? <Icon name={icon} size="sm" color={fg} /> : null}
        <AppText variant="label" color={fg} align="center">
          {label}
        </AppText>
      </View>
    </Pressable>
  );
}
