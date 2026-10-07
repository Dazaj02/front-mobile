import React from 'react';
import { Pressable, View } from 'react-native';

import { AppText } from '../atoms/AppText';
import { Badge } from '../atoms/Badge';
import { IconButton } from '../atoms/IconButton';
import { ProgressBar } from '../atoms/ProgressBar';
import { useTheme } from '../theme/useTheme';
import { borderWidth } from '../tokens';

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
  onDelete?: () => void; // si se omite no se muestra el botón de eliminar
  deleteDisabled?: boolean; // sin conexión
}

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
  onDelete,
  deleteDisabled = false,
}: ArticleCardProps) {
  const { components: c, spacing } = useTheme();
  const percent = Math.round(progress * 100);
  const summary = `${doseCount} dosis, ${totalMinutes} min`;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        borderRadius: c.card.radius,
        backgroundColor: c.card.bg,
        borderWidth: borderWidth.thin,
        borderColor: c.card.border,
        elevation: c.card.elevation,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${category ? `${category}. ` : ''}${summary}. Progreso ${percent} %`}
        onPress={onPress}
        style={{ flex: 1, minWidth: 0, gap: spacing.sm, padding: c.card.padding }}
      >
        {category ? <Badge label={category} tone="accent" /> : null}
        <AppText variant="title" numberOfLines={3}>
          {title}
        </AppText>
        <Badge label={summary} icon="time-outline" />
        <ProgressBar value={progress} accessibilityLabel={`Progreso de ${title}`} />
      </Pressable>
      <View style={{ paddingTop: spacing.xs, paddingRight: spacing.xs }}>
        <IconButton
          icon={bookmarked ? 'bookmark' : 'bookmark-outline'}
          accessibilityLabel={bookmarked ? 'Quitar de guardados' : 'Guardar artículo'}
          onPress={onToggleBookmark}
          color={bookmarked ? 'accent' : 'secondary'}
          disabled={bookmarkDisabled}
        />
        {onDelete ? (
          <IconButton
            icon="trash-outline"
            accessibilityLabel={`Eliminar ${title}`}
            onPress={onDelete}
            color="secondary"
            disabled={deleteDisabled}
          />
        ) : null}
      </View>
    </View>
  );
}
