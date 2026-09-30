import React, { useState } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from '../atoms/IconButton';
import { useTheme } from '../theme/useTheme';
import { DevCatalogScreen } from './DevCatalogScreen';

function Fab({ onPress }: { onPress: () => void }) {
  const insets = useSafeAreaInsets();
  const { colors, spacing, radii, layout } = useTheme();
  return (
    <View
      style={{
        position: 'absolute',
        right: spacing.sm,
        bottom: insets.bottom + spacing.xxxl + spacing.xxxl,
        zIndex: layout.zIndex.toast,
        borderRadius: radii.pill,
        backgroundColor: colors.bg.elevated,
      }}
    >
      <IconButton icon="color-palette-outline" accessibilityLabel="Abrir catálogo de componentes" onPress={onPress} color="accent" />
    </View>
  );
}

// Solo en desarrollo. En release (__DEV__ = false) no renderiza nada extra.
// Transitorio: en F5 pasa a ser una pantalla del navegador.
export function DevCatalogHost({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  if (!__DEV__) return <>{children}</>;
  return (
    <SafeAreaProvider>
      {open ? <DevCatalogScreen onClose={() => setOpen(false)} /> : children}
      {!open ? <Fab onPress={() => setOpen(true)} /> : null}
    </SafeAreaProvider>
  );
}
