import React from 'react';
import { View } from 'react-native';

import { AppText } from '../atoms/AppText';
import { IconButton } from '../atoms/IconButton';
import type { IconName } from '../atoms/Icon';
import { useTheme } from '../theme/useTheme';

export interface HeaderAction {
  icon: IconName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

export interface AppHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  actions?: HeaderAction[];
}

export function AppHeader({ title, subtitle, onBack, actions = [] }: AppHeaderProps) {
  const { spacing, sizes } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: sizes.touchMin,
        gap: spacing.sm,
        paddingVertical: spacing.xs,
      }}
    >
      {onBack ? <IconButton icon="chevron-back" accessibilityLabel="Volver" onPress={onBack} /> : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText variant="headline" accessibilityRole="header">
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" color="secondary">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {actions.map((a) => (
        <IconButton key={a.label} icon={a.icon} accessibilityLabel={a.label} onPress={a.onPress} disabled={a.disabled} />
      ))}
    </View>
  );
}
