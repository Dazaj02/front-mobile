import React from 'react';
import { Switch as RNSwitch, View } from 'react-native';

import { useTheme } from '../theme/useTheme';

export interface SwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityLabel: string;
  disabled?: boolean;
}

export function Switch({ value, onValueChange, accessibilityLabel, disabled = false }: SwitchProps) {
  const { colors, sizes, opacity } = useTheme();
  return (
    <View
      style={{
        minWidth: sizes.touchMin,
        minHeight: sizes.touchMin,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? opacity.disabled : 1,
      }}
    >
      <RNSwitch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        accessibilityRole="switch"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ checked: value, disabled }}
        trackColor={{ false: colors.border.strong, true: colors.accent.default }}
        thumbColor={value ? colors.text.onAccent : colors.bg.elevated}
      />
    </View>
  );
}
