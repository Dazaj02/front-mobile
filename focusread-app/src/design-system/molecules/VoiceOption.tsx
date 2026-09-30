import React from 'react';
import { Pressable, View } from 'react-native';

import { AppText } from '../atoms/AppText';
import { Icon } from '../atoms/Icon';
import { IconButton } from '../atoms/IconButton';
import { useTheme } from '../theme/useTheme';

export interface VoiceOptionProps {
  name: string;
  language: string;
  selected: boolean;
  onSelect: () => void;
  onPreview: () => void;
}

export function VoiceOption({ name, language, selected, onSelect, onPreview }: VoiceOptionProps) {
  const { sizes, spacing, colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: sizes.touchMin }}>
      <Pressable
        accessibilityRole="radio"
        accessibilityLabel={`${name}, ${language}`}
        accessibilityState={{ checked: selected }}
        onPress={onSelect}
        style={({ pressed }) => ({
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          minHeight: sizes.touchMin,
          paddingVertical: spacing.sm,
          backgroundColor: pressed ? colors.bg.sunken : 'transparent',
        })}
      >
        <Icon name={selected ? 'radio-button-on' : 'radio-button-off'} color={selected ? 'accent' : 'muted'} />
        <View style={{ flex: 1 }}>
          <AppText variant="body">{name}</AppText>
          <AppText variant="caption" color="secondary">
            {language}
          </AppText>
        </View>
      </Pressable>
      <IconButton icon="play-circle-outline" accessibilityLabel={`Probar voz ${name}`} onPress={onPreview} color="accent" />
    </View>
  );
}
