// Editorial: Newsreader (serif) es la voz de la app; Instrument Sans acompaña en la interfaz.
export const fontFamilies = {
  newsreader400: 'Newsreader_400Regular',
  newsreader400Italic: 'Newsreader_400Regular_Italic',
  newsreader600: 'Newsreader_600SemiBold',
  sans400: 'InstrumentSans_400Regular',
  sans500: 'InstrumentSans_500Medium',
  sans600: 'InstrumentSans_600SemiBold',
} as const;

export interface TextStyleToken {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing?: number;
  textTransform?: 'uppercase';
}

export type TextVariant =
  | 'hero'
  | 'metric'
  | 'display'
  | 'headline'
  | 'title'
  | 'titleSerif'
  | 'quote'
  | 'bodyLarge'
  | 'body'
  | 'label'
  | 'caption'
  | 'overline'
  | 'reading'
  | 'readingTitle';

const t = (fontFamily: string, fontSize: number, lineHeight: number, extra: Partial<TextStyleToken> = {}): TextStyleToken => ({
  fontFamily,
  fontSize,
  lineHeight,
  ...extra,
});

export const READER_FONT_SCALE = { min: 0.8, max: 1.6, step: 0.1, default: 1 } as const;

export function clampReaderFontScale(value: number): number {
  const stepped = Math.round(value / READER_FONT_SCALE.step) * READER_FONT_SCALE.step;
  const clamped = Math.min(READER_FONT_SCALE.max, Math.max(READER_FONT_SCALE.min, stepped));
  return Math.round(clamped * 10) / 10;
}

export function createTypography(readerFontScale: number): Record<TextVariant, TextStyleToken> {
  const s = readerFontScale;
  return {
    hero: t(fontFamilies.newsreader600, 38, 44, { letterSpacing: -0.4 }), // título de pestaña
    metric: t(fontFamilies.newsreader600, 64, 68, { letterSpacing: -1 }), // cifra protagonista
    display: t(fontFamilies.newsreader600, 32, 40),
    headline: t(fontFamilies.newsreader600, 24, 32),
    title: t(fontFamilies.sans600, 20, 28),
    titleSerif: t(fontFamilies.newsreader600, 20, 26), // títulos de artículo en listas
    quote: t(fontFamilies.newsreader400Italic, 16, 24),
    bodyLarge: t(fontFamilies.sans400, 18, 28),
    body: t(fontFamilies.sans400, 16, 24),
    label: t(fontFamilies.sans500, 14, 20),
    caption: t(fontFamilies.sans400, 12, 16),
    overline: t(fontFamilies.sans600, 11, 16, { letterSpacing: 1.3, textTransform: 'uppercase' }), // antetítulo
    reading: t(fontFamilies.newsreader400, 19 * s, 31 * s),
    readingTitle: t(fontFamilies.newsreader600, 26 * s, 34 * s),
  };
}
