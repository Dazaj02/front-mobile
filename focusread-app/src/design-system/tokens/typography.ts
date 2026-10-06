export const fontFamilies = {
  newsreader400: 'Newsreader_400Regular',
  newsreader600: 'Newsreader_600SemiBold',
  inter400: 'Inter_400Regular',
  inter500: 'Inter_500Medium',
  inter600: 'Inter_600SemiBold',
} as const;

export interface TextStyleToken {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
}

export type TextVariant =
  | 'display'
  | 'headline'
  | 'title'
  | 'bodyLarge'
  | 'body'
  | 'label'
  | 'caption'
  | 'reading'
  | 'readingTitle';

const t = (fontFamily: string, fontSize: number, lineHeight: number): TextStyleToken => ({
  fontFamily,
  fontSize,
  lineHeight,
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
    display: t(fontFamilies.newsreader600, 32, 40),
    headline: t(fontFamilies.newsreader600, 24, 32),
    title: t(fontFamilies.inter600, 20, 28),
    bodyLarge: t(fontFamilies.inter400, 18, 28),
    body: t(fontFamilies.inter400, 16, 24),
    label: t(fontFamilies.inter500, 14, 20),
    caption: t(fontFamilies.inter400, 12, 16),
    reading: t(fontFamilies.newsreader400, 19 * s, 31 * s),
    readingTitle: t(fontFamilies.newsreader600, 26 * s, 34 * s),
  };
}
