import React from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '../atoms/AppText';
import { Icon, type IconName } from '../atoms/Icon';
import { useTheme } from '../theme/useTheme';
import { borderWidth } from '../tokens';

export interface TabItem {
  key: string;
  label: string;
  icon: IconName;
  iconActive: IconName;
}

export interface BottomTabBarProps {
  tabs: readonly TabItem[];
  activeKey: string;
  onSelect: (key: string) => void;
}

// Presentacional: en F5 se conecta a React Navigation mediante la prop `tabBar`.
export function BottomTabBar({ tabs, activeKey, onSelect }: BottomTabBarProps) {
  const { components: c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      testID="tab-bar"
      accessibilityRole="tablist"
      style={{
        flexDirection: 'row',
        minHeight: c.tabBar.height + insets.bottom,
        paddingBottom: insets.bottom,
        backgroundColor: c.tabBar.bg,
        borderTopWidth: borderWidth.thin,
        borderTopColor: c.tabBar.border,
      }}
    >
      {tabs.map((t) => {
        const active = t.key === activeKey;
        return (
          <Pressable
            key={t.key}
            accessibilityRole="tab"
            accessibilityLabel={t.label}
            accessibilityState={{ selected: active }}
            onPress={() => onSelect(t.key)}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: c.tabBar.height }}
          >
            <Icon name={active ? t.iconActive : t.icon} color={active ? 'accent' : 'muted'} />
            <AppText
              variant="caption"
              color={active ? 'accent' : 'muted'}
              maxFontSizeMultiplier={c.tabBar.labelMaxFontMultiplier}
              numberOfLines={1}
            >
              {t.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
