import React from 'react';
import { ScrollView } from 'react-native';

import { Chip } from '../atoms/Chip';
import { useTheme } from '../theme/useTheme';

export interface FilterOption<T extends string> {
  id: T;
  label: string;
}

export interface FilterChipGroupProps<T extends string> {
  options: readonly FilterOption<T>[];
  value: T;
  onChange: (id: T) => void;
}

export function FilterChipGroup<T extends string>({ options, value, onChange }: FilterChipGroupProps<T>) {
  const { spacing } = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: spacing.sm, paddingVertical: spacing.xs }}
    >
      {options.map((o) => (
        <Chip key={o.id} label={o.label} selected={o.id === value} onPress={() => onChange(o.id)} />
      ))}
    </ScrollView>
  );
}
