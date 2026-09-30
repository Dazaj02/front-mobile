import React, { useState } from 'react';
import { View } from 'react-native';
import Slider from '@react-native-community/slider';

import { AppText } from '../atoms/AppText';
import { useTheme } from '../theme/useTheme';

export interface SliderFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void; // se llama al soltar (no en cada tick)
  format?: (value: number) => string;
}

export function SliderField({ label, value, min, max, step, onChange, format = (v) => String(v) }: SliderFieldProps) {
  const { colors, sizes, spacing } = useTheme();
  // Valor en vivo mientras se arrastra; se sincroniza cuando el valor guardado cambia desde fuera.
  const [live, setLive] = useState(value);
  const [synced, setSynced] = useState(value);
  if (value !== synced) {
    setSynced(value);
    setLive(value);
  }

  return (
    <View style={{ gap: spacing.xs }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.sm }}>
        <AppText variant="label" color="secondary">
          {label}
        </AppText>
        <AppText variant="label">{format(live)}</AppText>
      </View>
      <Slider
        style={{ height: sizes.touchMin }}
        minimumValue={min}
        maximumValue={max}
        step={step}
        value={value}
        onValueChange={setLive}
        onSlidingComplete={onChange}
        minimumTrackTintColor={colors.accent.default}
        maximumTrackTintColor={colors.border.strong}
        thumbTintColor={colors.accent.default}
        accessibilityLabel={label}
        accessibilityValue={{ min, max, now: live, text: format(live) }}
      />
    </View>
  );
}
