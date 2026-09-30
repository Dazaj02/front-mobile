import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useWindowClass } from '../layout/useWindowClass';
import { useTheme } from '../theme/useTheme';

export interface AuthTemplateProps {
  brand?: React.ReactNode; // logotipo / nombre
  children: React.ReactNode;
}

export function AuthTemplate({ brand, children }: AuthTemplateProps) {
  const { colors, layout, spacing } = useTheme();
  const { gutter } = useWindowClass();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg.base }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
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
