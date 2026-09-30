import React from 'react';
import { Pressable, View } from 'react-native';

import { AppText } from '../atoms/AppText';
import { Icon } from '../atoms/Icon';
import { useTheme } from '../theme/useTheme';

export interface DoseChecklistItemProps {
  index: number; // base 0
  title: string;
  minutes: number;
  done: boolean;
  current?: boolean;
  onPress?: () => void;
}

export function DoseChecklistItem({ index, title, minutes, done, current = false, onPress }: DoseChecklistItemProps) {
  const { sizes, spacing, colors } = useTheme();
  const status = done ? 'completada' : current ? 'en curso' : 'pendiente';
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={`Dosis ${index + 1}: ${title}, ${minutes} minutos, ${status}`}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        minHeight: sizes.touchMin,
        paddingVertical: spacing.sm,
        backgroundColor: pressed ? colors.bg.sunken : 'transparent',
      })}
    >
      <Icon
        name={done ? 'checkmark-circle' : current ? 'play-circle' : 'ellipse-outline'}
        color={done ? 'success' : current ? 'accent' : 'muted'}
      />
      <View style={{ flex: 1 }}>
        <AppText variant="body" color={done ? 'secondary' : 'primary'}>
          {title}
        </AppText>
      </View>
      <AppText variant="caption" color="muted">
        {minutes} min
      </AppText>
    </Pressable>
  );
}
