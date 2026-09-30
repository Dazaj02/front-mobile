import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';

import { AppBootstrap } from './src/app/AppBootstrap';
import { queryClient } from './src/app/queryClient';
import { ThemeProvider } from './src/design-system/theme/ThemeProvider';
import { AppNavigation } from './src/navigation/AppNavigation';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AppBootstrap>
            <ThemeProvider>
              <AppNavigation />
            </ThemeProvider>
          </AppBootstrap>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
