// Nivel 2: significado por tema. Valores iniciales; el test de contraste es la autoridad.
import { colorPrimitives as c } from './primitives';

export type ThemeMode = 'paper' | 'sepia' | 'dark';
export const THEME_MODES: readonly ThemeMode[] = ['paper', 'sepia', 'dark'];

export interface SemanticTokens {
  // inverse: superficie de "tinta" para piezas destacadas (tarjeta Continúa leyendo, selección).
  bg: { base: string; elevated: string; sunken: string; inverse: string };
  text: { primary: string; secondary: string; muted: string; onAccent: string; inverse: string; inverseMuted: string };
  accent: { default: string; pressed: string; subtle: string };
  border: { subtle: string; strong: string; focus: string; inverse: string };
  state: { success: string; warning: string; danger: string };
  overlay: { scrim: string };
  // Gráficas: barras neutras y la barra destacada (hoy).
  data: { neutral: string; highlight: string };
}

export const semanticTokens: Record<ThemeMode, SemanticTokens> = {
  // Editorial: papel cálido, tinta casi negra y un único acento índigo.
  paper: {
    bg: { base: c.paper50, elevated: c.white, sunken: c.paper100, inverse: c.paper900 },
    text: { primary: c.paper900, secondary: c.paper700, muted: c.paper600, onAccent: c.white, inverse: c.paper50, inverseMuted: c.paper300 },
    accent: { default: c.indigo700, pressed: c.indigo900, subtle: c.indigo100 },
    border: { subtle: c.paper200, strong: c.paper500, focus: c.indigo700, inverse: c.paper800 },
    state: { success: c.green700, warning: c.yellow800, danger: c.red700 },
    overlay: { scrim: c.scrimNeutral },
    data: { neutral: c.paper300, highlight: c.indigo700 },
  },
  sepia: {
    bg: { base: c.sepia50, elevated: c.sepia100, sunken: c.sepia150, inverse: c.sepia900 },
    text: { primary: c.sepia900, secondary: c.sepia700, muted: c.sepia600, onAccent: c.white, inverse: c.sepia50, inverseMuted: c.sepia200 },
    accent: { default: c.amber800, pressed: c.amber900, subtle: c.sepia300 },
    border: { subtle: c.sepia200, strong: c.sepia500, focus: c.amber800, inverse: c.sepia800 },
    state: { success: c.green800, warning: c.yellow800, danger: c.rose800 },
    overlay: { scrim: c.scrimSepia },
    data: { neutral: c.sepia200, highlight: c.amber800 },
  },
  dark: {
    bg: { base: c.gray950, elevated: c.gray900, sunken: c.gray925, inverse: c.gray100 },
    text: { primary: c.gray100, secondary: c.gray300, muted: c.gray500, onAccent: c.navy900, inverse: c.gray950, inverseMuted: c.gray600 },
    accent: { default: c.blue300, pressed: c.blue200, subtle: c.navy700 },
    border: { subtle: c.gray800, strong: c.gray500, focus: c.blue300, inverse: c.gray400 },
    state: { success: c.green300, warning: c.yellow300, danger: c.red200 },
    overlay: { scrim: c.scrimDark },
    data: { neutral: c.gray700, highlight: c.blue300 },
  },
};
