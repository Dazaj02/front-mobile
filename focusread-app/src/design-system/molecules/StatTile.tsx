import React from 'react';
import { View } from 'react-native';

import { AppText } from '../atoms/AppText';
import { Icon, type IconName } from '../atoms/Icon';
import { useTheme } from '../theme/useTheme';
import { borderWidth } from '../tokens';

export interface StatTileProps {
  label: string;
  value: string;
  icon?: IconName;
  hint?: string;
}

export function StatTile({ label, value, icon, hint }: StatTileProps) {
  const { components: c, spacing } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}${hint ? `. ${hint}` : ''}`}
      style={{
        flexGrow: 1,
        flexBasis: 0,
        minWidth: 0,
        gap: spacing.xs,
        padding: c.card.padding,
        borderRadius: c.card.radius,
        backgroundColor: c.card.bg,
        borderWidth: borderWidth.thin,
        borderColor: c.card.border,
      }}
    >
      {icon ? <Icon name={icon} color="accent" /> : null}
      <AppText variant="headline">{value}</AppText>
      <AppText variant="label" color="secondary">
        {label}
      </AppText>
      {hint ? (
        <AppText variant="caption" color="muted">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}
