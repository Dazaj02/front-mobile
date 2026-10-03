import React from 'react';
import { Pressable, View } from 'react-native';

import { AppText } from '../atoms/AppText';
import { IconButton } from '../atoms/IconButton';
import { SegmentedProgress } from '../atoms/SegmentedProgress';
import { useTheme } from '../theme/useTheme';

export interface ArticleCardProps {
  title: string;
  category?: string | null;
  totalMinutes: number;
  doseCount: number;
  progress: number; // 0–1 (dosis completadas / total)
  bookmarked: boolean;
  onPress: () => void;
  onToggleBookmark: () => void;
  bookmarkDisabled?: boolean; // sin conexión
}

// Estado de lectura en palabras: la fila lo muestra junto a la barra segmentada.
export function articleMeta(doseCount: number, totalMinutes: number, progress: number): string {
  const done = Math.round(Math.min(1, Math.max(0, progress)) * doseCount);
  if (done >= doseCount) return 'Completado';
  if (done > 0) return `Dosis ${done + 1} de ${doseCount}`;
  return `${doseCount} dosis · ${totalMinutes} min`;
}

// Editorial: fila sin caja (antetítulo de categoría, título en serif, filete inferior).
export function ArticleCard({
  title,
  category,
  totalMinutes,
  doseCount,
  progress,
  bookmarked,
  onPress,
  onToggleBookmark,
  bookmarkDisabled = false,
}: ArticleCardProps) {
  const { components: c, spacing, opacity } = useTheme();
  const percent = Math.round(progress * 100);
  const summary = `${doseCount} dosis, ${totalMinutes} min`;
  const completed = Math.round(Math.min(1, Math.max(0, progress)) * doseCount);
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.sm,
        borderBottomWidth: c.listRow.dividerWidth,
        borderBottomColor: c.listRow.divider,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${category ? `${category}. ` : ''}${summary}. Progreso ${percent} %`}
        onPress={onPress}
        style={({ pressed }) => ({
          flex: 1,
          minWidth: 0,
          gap: spacing.xs + spacing.xxs,
          paddingVertical: c.listRow.paddingY,
          opacity: pressed ? 1 - opacity.pressedOverlay * 2 : 1,
        })}
      >
        {category ? (
          <AppText variant="overline" color="accent">
            {category}
          </AppText>
        ) : null}
        <AppText variant="titleSerif" numberOfLines={3}>
          {title}
        </AppText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <AppText variant="caption" color="muted">
            {articleMeta(doseCount, totalMinutes, progress)}
          </AppText>
          <View style={{ width: spacing.xxxl * 2 }}>
            <SegmentedProgress total={doseCount} completed={completed} accessibilityLabel={`Progreso de ${title}`} />
          </View>
        </View>
      </Pressable>
      <View style={{ paddingTop: c.listRow.paddingY - spacing.sm }}>
        <IconButton
          icon={bookmarked ? 'bookmark' : 'bookmark-outline'}
          accessibilityLabel={bookmarked ? 'Quitar de guardados' : 'Guardar artículo'}
          onPress={onToggleBookmark}
          color={bookmarked ? 'accent' : 'secondary'}
          disabled={bookmarkDisabled}
        />
      </View>
    </View>
  );
}
