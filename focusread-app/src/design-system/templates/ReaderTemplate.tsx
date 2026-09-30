import React from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useWindowClass } from '../layout/useWindowClass';
import { useTheme } from '../theme/useTheme';

export interface ReaderTemplateProps {
  top: React.ReactNode; // controles superiores (volver, tema, tamaño)
  bottom?: React.ReactNode; // controles inferiores (audio)
  scrollKey?: string | number; // al cambiar, el texto vuelve a mostrarse desde arriba (p. ej. otra dosis)
  children: React.ReactNode;
}

// Pantalla completa: columna de lectura centrada (≤ readerMaxWidth) con controles respetando insets.
export function ReaderTemplate({ top, bottom, scrollKey, children }: ReaderTemplateProps) {
  const { colors, layout, spacing } = useTheme();
  const { gutter } = useWindowClass();
  const column = {
    width: '100%' as const,
    maxWidth: layout.readerMaxWidth,
    alignSelf: 'center' as const,
    paddingHorizontal: gutter,
  };
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg.base }}>
      <View style={[column, { paddingVertical: spacing.xs }]}>{top}</View>
      <ScrollView key={scrollKey} contentContainerStyle={{ flexGrow: 1, paddingVertical: spacing.lg }}>
        <View testID="reader-column" style={column}>
          {children}
        </View>
      </ScrollView>
      {bottom ? <View style={[column, { paddingVertical: spacing.sm }]}>{bottom}</View> : null}
    </SafeAreaView>
  );
}
