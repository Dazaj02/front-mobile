// Nivel 2: significado por tema. Valores iniciales; el test de contraste es la autoridad.
import { colorPrimitives as c } from './primitives';

export type ThemeMode = 'paper' | 'sepia' | 'dark';
export const THEME_MODES: readonly ThemeMode[] = ['paper', 'sepia', 'dark'];

export interface SemanticTokens {
  bg: { base: string; elevated: string; sunken: string };
  text: { primary: string; secondary: string; muted: string; onAccent: string };
  accent: { default: string; pressed: string; subtle: string };
  border: { subtle: string; strong: string; focus: string };
  state: { success: string; warning: string; danger: string };
  overlay: { scrim: string };
}

export const semanticTokens: Record<ThemeMode, SemanticTokens> = {
  paper: {
    bg: { base: c.paper50, elevated: c.white, sunken: c.paper100 },
    text: { primary: c.paper900, secondary: c.paper700, muted: c.paper600, onAccent: c.white },
    accent: { default: c.blue700, pressed: c.blue900, subtle: c.blue100 },
    border: { subtle: c.paper200, strong: c.paper500, focus: c.blue700 },
    state: { success: c.green700, warning: c.yellow700, danger: c.red700 },
    overlay: { scrim: c.scrimNeutral },
  },
  sepia: {
    bg: { base: c.sepia50, elevated: c.sepia100, sunken: c.sepia150 },
    text: { primary: c.sepia900, secondary: c.sepia700, muted: c.sepia600, onAccent: c.white },
    accent: { default: c.amber800, pressed: c.amber900, subtle: c.sepia300 },
    border: { subtle: c.sepia200, strong: c.sepia500, focus: c.amber800 },
    state: { success: c.green800, warning: c.yellow800, danger: c.rose800 },
    overlay: { scrim: c.scrimSepia },
  },
  dark: {
    bg: { base: c.gray950, elevated: c.gray900, sunken: c.gray925 },
    text: { primary: c.gray100, secondary: c.gray300, muted: c.gray500, onAccent: c.navy900 },
    accent: { default: c.blue300, pressed: c.blue200, subtle: c.navy700 },
    border: { subtle: c.gray800, strong: c.gray500, focus: c.blue300 },
    state: { success: c.green300, warning: c.yellow300, danger: c.red200 },
    overlay: { scrim: c.scrimDark },
  },
};
