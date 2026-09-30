import React, { createContext, useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

import { useSettingsStore } from '../../state/settingsStore';
import {
  createComponentTokens,
  createTypography,
  elevation,
  layout,
  opacity,
  radii,
  resolveDurations,
  semanticTokens,
  sizes,
  spacing,
  type ComponentTokens,
  type DurationName,
  type SemanticTokens,
  type TextStyleToken,
  type TextVariant,
  type ThemeMode,
} from '../tokens';

export interface Theme {
  mode: ThemeMode;
  isDark: boolean;
  colors: SemanticTokens;
  components: ComponentTokens;
  typography: Record<TextVariant, TextStyleToken>;
  spacing: typeof spacing;
  radii: typeof radii;
  elevation: typeof elevation;
  opacity: typeof opacity;
  sizes: typeof sizes;
  layout: typeof layout;
  durations: Record<DurationName, number>;
  readerFontScale: number;
  reduceMotion: boolean;
}

export const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const mode = useSettingsStore((s) => s.theme);
  const readerFontScale = useSettingsStore((s) => s.readerFontScale);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => active && setReduceMotion(v));
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      active = false;
      sub.remove();
    };
  }, []);

  const theme = useMemo<Theme>(() => {
    const colors = semanticTokens[mode];
    return {
      mode,
      isDark: mode === 'dark',
      colors,
      components: createComponentTokens(colors),
      typography: createTypography(readerFontScale),
      spacing,
      radii,
      elevation,
      opacity,
      sizes,
      layout,
      durations: resolveDurations(reduceMotion),
      readerFontScale,
      reduceMotion,
    };
  }, [mode, readerFontScale, reduceMotion]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}
