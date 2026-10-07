import React from "react";
import { View } from "react-native";

import { AppText } from "../atoms/AppText";
import { Icon } from "../atoms/Icon";
import { ProgressRing } from "../atoms/ProgressRing";
import { ProgressBar } from "../atoms/ProgressBar";
import { useTheme } from "../theme/useTheme";
import { borderWidth } from "../tokens";

export interface DailyProgressCardProps {
  minutesToday: number;
  dosesToday: number;
  goalMinutes?: number; // el contrato no define meta diaria: sin ella no hay barra
  streakDays?: number; // si se indica, se muestra el anillo de racha (semana de 7 días)
}

export function DailyProgressCard({
  minutesToday,
  dosesToday,
  goalMinutes,
  streakDays,
}: DailyProgressCardProps) {
  const { components: c, spacing } = useTheme();
  const streakText =
    streakDays === undefined
      ? ""
      : `. Racha de ${streakDays} ${streakDays === 1 ? "día" : "días"}`;
  const summary = `Hoy: ${minutesToday} min leídos, ${dosesToday} ${dosesToday === 1 ? "dosis completada" : "dosis completadas"}`;
  return (
    <View
      accessible
      accessibilityLabel={`${goalMinutes ? `${summary}. Meta ${goalMinutes} minutos` : summary}${streakText}`}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.lg,
        padding: c.card.padding,
        borderRadius: c.card.radius,
        backgroundColor: c.card.bg,
        borderWidth: borderWidth.thin,
        borderColor: c.card.border,
      }}
    >
      {streakDays !== undefined ? (
        <ProgressRing value={streakDays / 7}>
          <Icon name="flame" size="sm" color="accent" />
          <AppText variant="label">{streakDays}</AppText>
        </ProgressRing>
      ) : null}
      <View style={{ flex: 1, minWidth: 0, gap: spacing.sm }}>
        <AppText variant="label" color="secondary">
          Tu día
        </AppText>
        <AppText variant="headline">{minutesToday} min</AppText>
        <AppText variant="caption" color="muted">
          {dosesToday}{" "}
          {dosesToday === 1 ? "dosis completada" : "dosis completadas"}
        </AppText>
        {goalMinutes ? (
          <ProgressBar
            value={minutesToday / goalMinutes}
            accessibilityLabel={`Meta diaria de ${goalMinutes} minutos`}
          />
        ) : null}
      </View>
    </View>
  );
}
