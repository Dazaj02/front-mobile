import React from 'react';
import { View } from 'react-native';

import { AppText } from '../atoms/AppText';
import { IconButton } from '../atoms/IconButton';
import { useTheme } from '../theme/useTheme';
import { clampReaderFontScale, READER_FONT_SCALE } from '../tokens';

export interface FontSizeStepperProps {
  value: number;
  onChange: (value: number) => void;
}

export function FontSizeStepper({ value, onChange }: FontSizeStepperProps) {
  const { spacing } = useTheme();
  const percent = Math.round(value * 100);
  const atMin = value <= READER_FONT_SCALE.min;
  const atMax = value >= READER_FONT_SCALE.max;
  return (
    <View
      accessible={false}
      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md }}
    >
      <IconButton
        icon="remove"
        accessibilityLabel="Reducir tamaño de letra"
        disabled={atMin}
        onPress={() => onChange(clampReaderFontScale(value - READER_FONT_SCALE.step))}
      />
      <View accessible accessibilityRole="adjustable" accessibilityLabel="Tamaño de letra" accessibilityValue={{ text: `${percent} %` }}>
        <AppText variant="label" align="center">
          {percent} %
        </AppText>
      </View>
      <IconButton
        icon="add"
        accessibilityLabel="Aumentar tamaño de letra"
        disabled={atMax}
        onPress={() => onChange(clampReaderFontScale(value + READER_FONT_SCALE.step))}
      />
    </View>
  );
}
