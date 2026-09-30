import React from 'react';
import { View } from 'react-native';

import { Icon } from '../atoms/Icon';
import { IconButton } from '../atoms/IconButton';
import { TextInputBase } from '../atoms/TextInputBase';
import { useTheme } from '../theme/useTheme';

export interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChangeText, placeholder = 'Buscar' }: SearchBarProps) {
  const { spacing, sizes } = useTheme();
  const inset = spacing.lg + sizes.iconMd + spacing.sm;
  return (
    <View accessibilityRole="search">
      <TextInputBase
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        accessibilityLabel={placeholder}
        returnKeyType="search"
        autoCorrect={false}
        insetLeft={inset}
        insetRight={sizes.touchMin}
      />
      <View
        pointerEvents="none"
        style={{ position: 'absolute', left: spacing.lg, top: 0, bottom: 0, justifyContent: 'center' }}
      >
        <Icon name="search-outline" color="muted" />
      </View>
      {value.length > 0 ? (
        <View style={{ position: 'absolute', right: spacing.xs, top: 0, bottom: 0, justifyContent: 'center' }}>
          <IconButton icon="close-circle" accessibilityLabel="Borrar búsqueda" onPress={() => onChangeText('')} color="muted" />
        </View>
      ) : null}
    </View>
  );
}
