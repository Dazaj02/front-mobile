import React from 'react';
import { View } from 'react-native';

import { useTheme } from '../theme/useTheme';

export interface ProgressBarProps {
  value: number; // 0–1
  accessibilityLabel: string;
}

export function ProgressBar({ value, accessibilityLabel }: ProgressBarProps) {
  const { components: c } = useTheme();
  const clamped = Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
  const percent = Math.round(clamped * 100);
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: percent, text: `${percent} %` }}
      style={{
        height: c.progressBar.height,
        borderRadius: c.progressBar.radius,
        backgroundColor: c.progressBar.track,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          width: `${percent}%`,
          height: '100%',
          borderRadius: c.progressBar.radius,
          backgroundColor: c.progressBar.fill,
        }}
      />
    </View>
  );
}
