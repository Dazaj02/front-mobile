import React from 'react';
import { render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ThemeProvider } from './theme/ThemeProvider';

// Inset inferior de 24 dp = barra de gestos típica de Android.
export const TEST_INSETS = { top: 24, bottom: 24, left: 0, right: 0 };

export function TestProviders({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 360, height: 800 }, insets: TEST_INSETS }}>
      <ThemeProvider>{children}</ThemeProvider>
    </SafeAreaProvider>
  );
}

export function renderWithTheme(ui: React.ReactElement) {
  return render(<TestProviders>{ui}</TestProviders>);
}

export function flattenStyle(style: unknown): Record<string, unknown> {
  if (Array.isArray(style)) return Object.assign({}, ...style.map(flattenStyle));
  return (style as Record<string, unknown>) ?? {};
}
