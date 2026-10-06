import { semanticTokens, THEME_MODES, type SemanticTokens } from './semantic';

function parseColor(value: string): [number, number, number, number] {
  const hex = /^#([0-9a-f]{6})$/i.exec(value);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1];
  }
  const rgba = /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/.exec(value);
  if (rgba) return [Number(rgba[1]), Number(rgba[2]), Number(rgba[3]), rgba[4] ? Number(rgba[4]) : 1];
  throw new Error(`Color no soportado: ${value}`);
}

function luminance(value: string): number {
  const [r, g, b] = parseColor(value)
    .slice(0, 3)
    .map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

type Pair = [label: string, fg: (t: SemanticTokens) => string, bg: (t: SemanticTokens) => string, min: number];

const surfaces: [string, (t: SemanticTokens) => string][] = [
  ['bg.base', (t) => t.bg.base],
  ['bg.elevated', (t) => t.bg.elevated],
  ['bg.sunken', (t) => t.bg.sunken],
];

const pairs: Pair[] = [];
for (const [sn, sg] of surfaces) {
  pairs.push([`text.primary / ${sn}`, (t) => t.text.primary, sg, 4.5]);
  pairs.push([`text.secondary / ${sn}`, (t) => t.text.secondary, sg, 4.5]);
  pairs.push([`text.muted / ${sn}`, (t) => t.text.muted, sg, 4.5]);
}
// accent.subtle solo aloja texto primario/secundario (chip activo, tarjeta "continuar").
// text.muted NO cumple sobre accent.subtle en paper/dark, por eso las filas presionadas usan bg.sunken.
for (const k of ['primary', 'secondary'] as const) {
  pairs.push([`text.${k} / accent.subtle`, (t) => t.text[k], (t) => t.accent.subtle, 4.5]);
}
pairs.push(['text.onAccent / accent.pressed', (t) => t.text.onAccent, (t) => t.accent.pressed, 4.5]);
pairs.push(['text.onAccent / accent.default', (t) => t.text.onAccent, (t) => t.accent.default, 4.5]);
for (const [sn, sg] of [...surfaces.slice(0, 2), ['accent.subtle', (t: SemanticTokens) => t.accent.subtle] as [string, (t: SemanticTokens) => string]]) {
  pairs.push([`accent.default / ${sn}`, (t) => t.accent.default, sg, 4.5]);
}
for (const [sn, sg] of surfaces.slice(0, 2)) {
  for (const k of ['success', 'warning', 'danger'] as const) {
    pairs.push([`state.${k} / ${sn}`, (t) => t.state[k], sg, 4.5]);
  }
  pairs.push([`border.strong / ${sn}`, (t) => t.border.strong, sg, 3]);
  pairs.push([`border.focus / ${sn}`, (t) => t.border.focus, sg, 3]);
}

describe('contraste WCAG de los tokens semánticos', () => {
  for (const mode of THEME_MODES) {
    describe(mode, () => {
      it.each(pairs)('%s', (_label, fg, bg, min) => {
        const t = semanticTokens[mode];
        expect(contrastRatio(fg(t), bg(t))).toBeGreaterThanOrEqual(min);
      });
    });
  }
});
