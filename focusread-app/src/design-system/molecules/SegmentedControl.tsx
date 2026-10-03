import React from 'react';
import { Pressable, View } from 'react-native';

import { AppText } from '../atoms/AppText';
import { useTheme } from '../theme/useTheme';

export interface SegmentedOption<T extends string | number> {
  id: T;
  label: string;
}

export interface SegmentedControlProps<T extends string | number> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (id: T) => void;
  accessibilityLabel: string;
}

// Elección única entre pocas opciones (p. ej. duración de la dosis). Cada segmento es un radio.
export function SegmentedControl<T extends string | number>({ options, value, onChange, accessibilityLabel }: SegmentedControlProps<T>) {
  const { components: c, colors, sizes } = useTheme();
  const s = c.segmentedControl;
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={{ flexDirection: 'row', gap: s.padding, padding: s.padding, borderRadius: s.radius + s.padding, backgroundColor: s.track }}
    >
      {options.map((o) => {
        const selected = o.id === value;
        return (
          <Pressable
            key={String(o.id)}
            accessibilityRole="radio"
            accessibilityLabel={o.label}
            accessibilityState={{ checked: selected }}
            hitSlop={(sizes.touchMin - s.height) / 2}
            onPress={() => onChange(o.id)}
            style={{
              flex: 1,
              minHeight: s.height,
              borderRadius: s.radius,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: selected ? s.thumb : 'transparent',
              borderWidth: selected ? 1 : 0,
              borderColor: colors.border.subtle,
            }}
          >
            <AppText variant="label" color={selected ? 'primary' : 'secondary'}>
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
