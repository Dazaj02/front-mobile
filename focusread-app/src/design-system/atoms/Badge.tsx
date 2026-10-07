import React from 'react';
import { View } from 'react-native';

import { useTheme } from '../theme/useTheme';
import { borderWidth } from '../tokens';
import { AppText, type TextColor } from './AppText';
import { Icon, type IconName } from './Icon';

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

export interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  icon?: IconName;
}

export function Badge({ label, tone = 'neutral', icon }: BadgeProps) {
  const { components: c, colors } = useTheme();
  const textColor: Record<BadgeTone, TextColor> = {
    neutral: 'secondary',
    accent: 'accent',
    success: 'success',
    warning: 'warning',
    danger: 'danger',
  };
  const border: Record<BadgeTone, string> = {
    neutral: colors.border.subtle,
    accent: colors.accent.default,
    success: colors.state.success,
    warning: colors.state.warning,
    danger: colors.state.danger,
  };
  return (
    <View
      accessible
      accessibilityLabel={label}
      style={{
        minHeight: c.badge.height,
        borderRadius: c.badge.radius,
        paddingHorizontal: c.badge.paddingX,
        justifyContent: 'center',
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        borderWidth: borderWidth.thin,
        borderColor: border[tone],
        backgroundColor: tone === 'accent' ? colors.accent.subtle : colors.bg.elevated,
      }}
    >
      {icon ? <Icon name={icon} size="sm" color={textColor[tone]} /> : null}
      <AppText variant="label" color={textColor[tone]}>
        {label}
      </AppText>
    </View>
  );
}
