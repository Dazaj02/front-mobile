import React from 'react';
import { ScrollView, View } from 'react-native';

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
  variant?: 'pill' | 'underline'; // underline: pestañas de texto sobre un filete
}

export function FilterChipGroup<T extends string>({ options, value, onChange, variant = 'pill' }: FilterChipGroupProps<T>) {
  const { spacing, components: c } = useTheme();
  const underline = variant === 'underline';
  return (
    <View style={underline ? { borderBottomWidth: c.listRow.dividerWidth, borderBottomColor: c.listRow.divider } : undefined}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: underline ? spacing.xl - spacing.xs : spacing.sm, paddingVertical: underline ? 0 : spacing.xs }}
      >
        {options.map((o) => (
          <Chip key={o.id} label={o.label} variant={variant} selected={o.id === value} onPress={() => onChange(o.id)} />
        ))}
      </ScrollView>
    </View>
  );
}
