import React from 'react';
import { View } from 'react-native';

import { AppText } from '../atoms/AppText';
import { Icon, type IconName } from '../atoms/Icon';
import { useTheme } from '../theme/useTheme';

export interface StatTileProps {
  label: string;
  value: string;
  icon?: IconName;
  hint?: string;
  divider?: boolean; // filete inferior (rejilla editorial)
}

// Editorial: sin caja; etiqueta discreta arriba y cifra en serif.
export function StatTile({ label, value, icon, hint, divider = false }: StatTileProps) {
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
        paddingVertical: spacing.lg,
        borderBottomWidth: divider ? c.listRow.dividerWidth : 0,
        borderBottomColor: c.listRow.divider,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
        {icon ? <Icon name={icon} size="sm" color="muted" /> : null}
        <AppText variant="label" color="muted">
          {label}
        </AppText>
      </View>
      <AppText variant="display">{value}</AppText>
      {hint ? (
        <AppText variant="caption" color="muted">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}
