import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '../atoms/AppText';
import { IconButton } from '../atoms/IconButton';
import { useWindowClass } from '../layout/useWindowClass';
import { useTheme } from '../theme/useTheme';

export interface AudioMiniDockProps {
  title: string;
  playing: boolean;
  onToggle: () => void;
  onClose: () => void;
  aboveTabBar?: boolean; // true: se apoya sobre la barra de pestañas
}

// Posición: `dock` se ubica sobre el tabBar respetando el inset inferior (gestos / 3 botones).
export function dockBottomOffset(tabBarHeight: number, insetBottom: number, aboveTabBar: boolean): number {
  return aboveTabBar ? tabBarHeight + insetBottom : insetBottom;
}

export function AudioMiniDock({ title, playing, onToggle, onClose, aboveTabBar = true }: AudioMiniDockProps) {
  const { components: c, spacing, layout } = useTheme();
  const insets = useSafeAreaInsets();
  const { gutter } = useWindowClass();
  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: dockBottomOffset(c.tabBar.height, insets.bottom, aboveTabBar) + spacing.sm,
        zIndex: layout.zIndex.dock,
        alignItems: 'center',
      }}
    >
    <View
      style={{
        width: '100%',
        maxWidth: layout.contentMaxWidth,
        marginHorizontal: gutter,
        minHeight: c.dock.height,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: c.dock.radius,
        backgroundColor: c.dock.bg,
        elevation: c.dock.elevation,
      }}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText variant="caption" color="secondary">
          {playing ? 'Reproduciendo' : 'En pausa'}
        </AppText>
        <AppText variant="label" numberOfLines={1}>
          {title}
        </AppText>
      </View>
      <IconButton
        icon={playing ? 'pause' : 'play'}
        accessibilityLabel={playing ? 'Pausar lectura en voz alta' : 'Reanudar lectura en voz alta'}
        onPress={onToggle}
        color="accent"
      />
      <IconButton icon="close" accessibilityLabel="Cerrar reproductor" onPress={onClose} />
    </View>
    </View>
  );
}
