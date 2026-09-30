import React, { useRef } from 'react';
import { KeyboardAvoidingView, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useScrollToEndOnKeyboard } from '../layout/useScrollToEndOnKeyboard';
import { useWindowClass } from '../layout/useWindowClass';
import { useTheme } from '../theme/useTheme';

export interface AuthTemplateProps {
  brand?: React.ReactNode; // logotipo / nombre
  children: React.ReactNode;
}

export function AuthTemplate({ brand, children }: AuthTemplateProps) {
  const { colors, layout, spacing } = useTheme();
  const { gutter } = useWindowClass();
  const scrollRef = useRef<ScrollView>(null);
  useScrollToEndOnKeyboard(scrollRef);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg.base }}>
      {/* Con edge-to-edge (Android 15+) el sistema ya no redimensiona la ventana: "padding" es fiable. */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingVertical: spacing.xl }}
        >
          <View
            testID="auth-column"
            style={{
              width: '100%',
              maxWidth: layout.authMaxWidth,
              alignSelf: 'center',
              paddingHorizontal: gutter,
              gap: spacing.xl,
            }}
          >
            {brand}
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
