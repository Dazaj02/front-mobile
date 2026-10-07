import React from "react";
import { Pressable, View } from "react-native";

import { AppText } from "../atoms/AppText";
import { BrandMark } from "../atoms/BrandMark";
import { Icon, type IconName } from "../atoms/Icon";
import { IconButton } from "../atoms/IconButton";
import { useTheme } from "../theme/useTheme";

export interface HeaderAction {
  icon: IconName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  primary?: boolean; // botón azul relleno con texto (acción principal de la pantalla)
}

export interface AppHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  brand?: string; // nombre de la app: muestra la marca y este texto sobre el título (pantallas principales)
  actions?: HeaderAction[];
}

export function AppHeader({
  title,
  subtitle,
  onBack,
  brand,
  actions = [],
}: AppHeaderProps) {
  const { spacing, sizes, colors, radii } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        minHeight: sizes.touchMin,
        gap: spacing.sm,
        paddingVertical: spacing.xs,
      }}
    >
      {onBack ? (
        <IconButton
          icon="chevron-back"
          accessibilityLabel="Volver"
          onPress={onBack}
        />
      ) : null}
      {brand ? <BrandMark width={36} /> : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        {brand ? (
          <AppText variant="caption" color="accent" numberOfLines={1}>
            {brand}
          </AppText>
        ) : null}
        <AppText variant="headline" accessibilityRole="header">
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" color="secondary">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {actions.map((a) =>
        a.primary ? (
          <Pressable
            key={a.label}
            accessibilityRole="button"
            accessibilityLabel={a.label}
            accessibilityState={{ disabled: Boolean(a.disabled) }}
            disabled={a.disabled}
            onPress={a.onPress}
            style={({ pressed }) => ({
              minHeight: sizes.touchMin,
              flexDirection: "row",
              alignItems: "center",
              gap: spacing.xs,
              paddingHorizontal: spacing.lg,
              borderRadius: radii.pill,
              backgroundColor: pressed
                ? colors.accent.pressed
                : colors.accent.default,
            })}
          >
            <Icon name={a.icon} size="sm" color="onAccent" />
            <AppText variant="label" color="onAccent">
              {a.label}
            </AppText>
          </Pressable>
        ) : (
          <IconButton
            key={a.label}
            icon={a.icon}
            accessibilityLabel={a.label}
            onPress={a.onPress}
            disabled={a.disabled}
          />
        ),
      )}
    </View>
  );
}
