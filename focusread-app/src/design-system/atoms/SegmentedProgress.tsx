import React from 'react';
import { View } from 'react-native';

import { useTheme } from '../theme/useTheme';

export interface SegmentedProgressProps {
  total: number; // número de dosis
  completed: number; // dosis terminadas
  partial?: number; // 0–1: avance dentro de la dosis en curso
  tone?: 'default' | 'inverse'; // inverse: sobre superficies de tinta
  accessibilityLabel: string;
}

// Un segmento por dosis: hace visible la idea central de FocusRead.
export function SegmentedProgress({ total, completed, partial = 0, tone = 'default', accessibilityLabel }: SegmentedProgressProps) {
  const { components: c } = useTheme();
  const t = c.segmentedProgress;
  const colors = tone === 'inverse' ? t.inverse : { track: t.track, fill: t.fill };
  const count = Math.max(1, Math.floor(total));
  const done = Math.min(count, Math.max(0, Math.floor(completed)));
  const part = Math.min(1, Math.max(0, Number.isFinite(partial) ? partial : 0));
  const percent = Math.round(((done + (done < count ? part : 0)) / count) * 100);
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: percent, text: `${percent} %` }}
      style={{ flexDirection: 'row', gap: t.gap, alignSelf: 'stretch' }}
    >
      {Array.from({ length: count }, (_, i) => {
        const fill = i < done ? 1 : i === done ? part : 0;
        return (
          <View
            key={i}
            style={{ flex: 1, height: t.height, borderRadius: t.radius, backgroundColor: colors.track, overflow: 'hidden' }}
          >
            {fill > 0 ? (
              <View style={{ width: `${Math.round(fill * 100)}%`, height: '100%', borderRadius: t.radius, backgroundColor: colors.fill }} />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
