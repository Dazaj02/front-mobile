import React from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useWindowClass } from '../layout/useWindowClass';
import { AppHeader, type AppHeaderProps } from '../organisms/AppHeader';
import { useTheme } from '../theme/useTheme';

export interface ScreenTemplateProps {
  header?: AppHeaderProps;
  banner?: React.ReactNode; // p. ej. Banner "Sin conexión" (F7)
  scroll?: boolean;
  bottomSpace?: number; // reserva sobre el contenido para dock / barra de pestañas
  children: React.ReactNode;
}

// Safe area + encabezado + gutter por clase de ventana + ancho máximo de contenido.
export function ScreenTemplate({ header, banner, scroll = true, bottomSpace = 0, children }: ScreenTemplateProps) {
  const { colors, layout, spacing } = useTheme();
  const { gutter } = useWindowClass();

  const column = (
    <View
      testID="screen-column"
      style={{
        width: '100%',
        maxWidth: layout.contentMaxWidth,
        alignSelf: 'center',
        paddingHorizontal: gutter,
        paddingBottom: bottomSpace,
        gap: spacing.lg,
      }}
    >
      {header ? <AppHeader {...header} /> : null}
      {banner}
      {children}
    </View>
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.bg.base }}>
      {scroll ? (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, paddingVertical: spacing.sm }}>
          {column}
        </ScrollView>
      ) : (
        column
      )}
    </SafeAreaView>
  );
}
