import React from 'react';
import { View } from 'react-native';

import { AppText, type TextColor } from '../atoms/AppText';
import { Button } from '../atoms/Button';
import { Icon, type IconName } from '../atoms/Icon';
import { useTheme } from '../theme/useTheme';
import { borderWidth } from '../tokens';

export type BannerTone = 'info' | 'offline' | 'error';

export interface BannerProps {
  tone?: BannerTone;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

const ICONS: Record<BannerTone, IconName> = {
  info: 'information-circle-outline',
  offline: 'cloud-offline-outline',
  error: 'alert-circle-outline',
};
const COLORS: Record<BannerTone, TextColor> = { info: 'accent', offline: 'warning', error: 'danger' };

export function Banner({ tone = 'info', message, actionLabel, onAction }: BannerProps) {
  const { colors, spacing, radii } = useTheme();
  const border = { info: colors.accent.default, offline: colors.state.warning, error: colors.state.danger }[tone];
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: spacing.sm,
        padding: spacing.md,
        borderRadius: radii.md,
        borderWidth: borderWidth.thin,
        borderColor: border,
        backgroundColor: colors.bg.elevated,
      }}
    >
      <Icon name={ICONS[tone]} color={COLORS[tone]} />
      {/* Solo el mensaje se anuncia; el botón de acción queda enfocable por separado. */}
      <View
        accessible
        accessibilityRole={tone === 'error' ? 'alert' : undefined}
        accessibilityLiveRegion={tone === 'error' ? 'assertive' : 'polite'}
        style={{ flexGrow: 1, flexShrink: 1, flexBasis: '60%' }}
      >
        <AppText variant="label">{message}</AppText>
      </View>
      {actionLabel && onAction ? <Button variant="ghost" label={actionLabel} onPress={onAction} /> : null}
    </View>
  );
}
