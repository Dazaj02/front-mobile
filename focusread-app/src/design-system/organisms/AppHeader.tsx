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
  emphasis?: 'filled'; // acción principal: círculo de tinta
}

export interface AppHeaderProps {
  title: string;
  subtitle?: string;
  kicker?: string; // antetítulo (p. ej. la fecha) sobre el título grande
  size?: 'large' | 'default'; // large: título editorial de pestaña
  onBack?: () => void;
  actions?: HeaderAction[];
}

export function AppHeader({ title, subtitle, kicker, size = 'default', onBack, actions = [] }: AppHeaderProps) {
  const { spacing, sizes } = useTheme();
  const large = size === 'large';
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: large ? 'flex-end' : 'center',
        minHeight: sizes.touchMin,
        gap: spacing.sm,
        paddingTop: large ? spacing.xl : spacing.xs,
        paddingBottom: spacing.xs,
      }}
    >
      {onBack ? <IconButton icon="chevron-back" accessibilityLabel="Volver" onPress={onBack} /> : null}
      <View style={{ flex: 1, minWidth: 0, gap: large ? spacing.xs : 0 }}>
        {kicker ? (
          <AppText variant="overline" color="muted">
            {kicker}
          </AppText>
        ) : null}
        <AppText variant={large ? 'hero' : 'headline'} accessibilityRole="header">
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" color="secondary">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {actions.map((a) => (
        <IconButton
          key={a.label}
          icon={a.icon}
          accessibilityLabel={a.label}
          onPress={a.onPress}
          disabled={a.disabled}
          variant={a.emphasis === 'filled' ? 'filled' : 'plain'}
        />
      ))}
    </View>
  );
}
