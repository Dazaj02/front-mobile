import React from 'react';
import { KeyboardAvoidingView, Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '../atoms/AppText';
import { IconButton } from '../atoms/IconButton';
import { useWindowClass } from '../layout/useWindowClass';
import { useTheme } from '../theme/useTheme';

export interface SheetTemplateProps {
  visible: boolean;
  title: string;
  onClose: () => void; // scrim, botón cerrar y botón atrás de Android
  children: React.ReactNode;
}

const MAX_HEIGHT_RATIO = 0.9;

export function SheetTemplate({ visible, title, onClose, children }: SheetTemplateProps) {
  const { components: c, spacing, layout, reduceMotion, radii } = useTheme();
  const insets = useSafeAreaInsets();
  const { height, gutter } = useWindowClass();
  return (
    <Modal
      visible={visible}
      transparent
      animationType={reduceMotion ? 'none' : 'slide'}
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <View style={{ flex: 1, justifyContent: 'flex-end', zIndex: layout.zIndex.sheet }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cerrar hoja"
            onPress={onClose}
            style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: c.sheet.scrim }}
          />
          <View
            accessibilityViewIsModal
            style={{
              width: '100%',
              maxWidth: layout.contentMaxWidth,
              maxHeight: height * MAX_HEIGHT_RATIO,
              alignSelf: 'center',
              backgroundColor: c.sheet.bg,
              borderTopLeftRadius: c.sheet.radiusTop,
              borderTopRightRadius: c.sheet.radiusTop,
              paddingHorizontal: gutter,
              paddingTop: spacing.sm,
              paddingBottom: insets.bottom + spacing.lg,
              gap: spacing.md,
            }}
          >
            <View
              style={{
                alignSelf: 'center',
                width: spacing.xxxl,
                height: spacing.xs,
                borderRadius: radii.pill,
                backgroundColor: c.sheet.handle,
              }}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <AppText variant="title" accessibilityRole="header">
                  {title}
                </AppText>
              </View>
              <IconButton icon="close" accessibilityLabel="Cerrar" onPress={onClose} />
            </View>
            {children}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
