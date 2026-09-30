import React from 'react';
import { Pressable, View } from 'react-native';

import { AppText } from '../atoms/AppText';
import { Icon } from '../atoms/Icon';
import { useTheme } from '../theme/useTheme';

export interface SettingRowProps {
  title: string;
  description?: string;
  control?: React.ReactNode; // Switch, valor, etc. (debe tener su propia etiqueta accesible)
  onPress?: () => void; // fila navegable: muestra chevron
  accessibilityHint?: string;
}

export function SettingRow({ title, description, control, onPress, accessibilityHint }: SettingRowProps) {
  const { sizes, spacing, colors } = useTheme();

  const content = (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap', // con fuente al 200 % el control baja debajo del texto
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: sizes.touchMin,
        paddingVertical: spacing.sm,
        columnGap: spacing.md,
        rowGap: spacing.xs,
      }}
    >
      <View style={{ flexGrow: 1, flexShrink: 1, flexBasis: '60%', gap: spacing.xxs }}>
        <AppText variant="body">{title}</AppText>
        {description ? (
          <AppText variant="caption" color="secondary">
            {description}
          </AppText>
        ) : null}
      </View>
      {control}
      {onPress && !control ? <Icon name="chevron-forward" color="muted" /> : null}
    </View>
  );

  if (!onPress) return content;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={description ? `${title}. ${description}` : title}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed }) => ({ backgroundColor: pressed ? colors.accent.subtle : 'transparent' })}
    >
      {content}
    </Pressable>
  );
}
