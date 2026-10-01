import { ChunkError, chunkText, countWords, estimateMinutes, normalizeText, WORDS_PER_MINUTE } from './chunker';

// Una oración de exactamente `n` palabras.
const sentence = (n: number) => `${'palabra '.repeat(n - 1)}final.`;
const paragraph = (words: number) => sentence(words);
const textOf = (...wordsPerParagraph: number[]) => wordsPerParagraph.map(paragraph).join('\n\n');

const T25 = 2.5 * WORDS_PER_MINUTE; // 450 palabras
const wordsOf = (chunks: { words: number }[]) => chunks.map((c) => c.words);

describe('normalizeText', () => {
  it('quita caracteres de control, colapsa espacios y conserva los párrafos', () => {
    const out = normalizeText('Hola\u0000   mundo\t\tfeliz\r\n\r\n\r\n\r\nOtro   párrafo\u0007 aquí');
    expect(out).toBe('Hola mundo feliz\n\nOtro párrafo aquí');
  });
});

describe('chunkText', () => {
  it('rechaza texto vacío', () => {
    expect(() => chunkText('  \n\n ', 2.5)).toThrow(ChunkError);
  });

  it('un texto corto queda en una sola dosis', () => {
    const chunks = chunkText(textOf(120), 2.5);
    expect(wordsOf(chunks)).toEqual([120]);
  });

  it('cierra cada dosis al llegar a ≥ 0.85 × objetivo y conserva todo el texto', () => {
    const chunks = chunkText(textOf(100, 100, 100, 100, 100, 100, 100, 100, 100, 100), 2.5);
    expect(wordsOf(chunks)).toEqual([400, 400, 200]);
    chunks.slice(0, -1).forEach((c) => expect(c.words).toBeGreaterThanOrEqual(0.85 * T25));
    expect(chunks.reduce((n, c) => n + c.words, 0)).toBe(1000);
  });

  it('no supera 1.3 × objetivo al acumular párrafos', () => {
    const chunks = chunkText(textOf(300, 300, 300), 2.5);
    expect(wordsOf(chunks)).toEqual([300, 300, 300]);
    chunks.forEach((c) => expect(c.words).toBeLessThanOrEqual(1.3 * T25));
  });

  it('fusiona el último fragmento si tiene menos de 0.4 × objetivo', () => {
    // 400 + tail de 50 (< 180): se fusionan
    expect(wordsOf(chunkText(textOf(100, 100, 100, 100, 50), 2.5))).toEqual([450]);
    // 400 + tail de 200 (≥ 180): se conserva
    expect(wordsOf(chunkText(textOf(100, 100, 100, 100, 100, 100), 2.5))).toEqual([400, 200]);
  });

  it('parte por oraciones un párrafo mayor a 1.5 × objetivo', () => {
    const longParagraph = Array.from({ length: 20 }, () => sentence(50)).join(' '); // 1000 palabras, 1 párrafo
    const chunks = chunkText(longParagraph, 2.5);
    expect(wordsOf(chunks)).toEqual([400, 400, 200]);
    chunks.forEach((c) => expect(c.words).toBeLessThanOrEqual(1.3 * T25));
  });

  it('una oración única puede superar 1.3 × objetivo', () => {
    const single = 'palabra '.repeat(799) + 'final.'; // 800 palabras sin puntuación interna
    expect(wordsOf(chunkText(single, 2.5))).toEqual([800]);
  });

  it('estMinutes = round(palabras / 180, 1)', () => {
    expect(estimateMinutes(450)).toBe(2.5);
    expect(estimateMinutes(270)).toBe(1.5);
    expect(estimateMinutes(200)).toBe(1.1);
    expect(chunkText(textOf(450), 2.5)[0].estMinutes).toBe(2.5);
    expect(estimateMinutes(1)).toBeGreaterThan(0);
  });

  it('permite exactamente 20 dosis', () => {
    const chunks = chunkText(textOf(...Array(20).fill(250)), 1.5);
    expect(chunks).toHaveLength(20);
  });

  it('lanza CONTENT_TOO_LONG con más de 20 dosis y sugiere una duración mayor', () => {
    try {
      chunkText(textOf(...Array(21).fill(250)), 1.5);
      throw new Error('debía fallar');
    } catch (e) {
      expect(e).toBeInstanceOf(ChunkError);
      expect((e as ChunkError).code).toBe('CONTENT_TOO_LONG');
      expect((e as ChunkError).suggestedMinutes).toBe(2.5);
    }
  });

  // Casos del backend (back-mobile/test/unit/chunker.test.ts), objetivo 1.5 min = 270 palabras:
  // 1.3× = 351, 1.5× = 405. Ambos chunkers deben producir los mismos cortes.
  describe('alineado con el chunker del backend (objetivo 1.5 min)', () => {
    const cut = (...paragraphs: number[]) => wordsOf(chunkText(textOf(...paragraphs), 1.5));

    it('un párrafo de 1.3×–1.5× es una unidad atómica: queda solo en su dosis', () => {
      expect(cut(380)).toEqual([380]);
      expect(cut(200, 380)).toEqual([200, 380]);
      expect(cut(405)).toEqual([405]);
    });

    it('la fusión final del último fragmento (< 0.4×) puede superar 1.3×', () => {
      expect(cut(100, 380, 100)).toEqual([100, 480]);
      expect(cut(380, 100)).toEqual([480]);
      expect(cut(100, 100, 100, 100)).toEqual([400]);
    });

    it('un párrafo de más de 1.5× se parte por oraciones', () => {
      const oneParagraph = Array.from({ length: 9 }, () => sentence(48)).join(' '); // 432 palabras (1.6×)
      const chunks = wordsOf(chunkText(oneParagraph, 1.5));
      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks.reduce((a, b) => a + b, 0)).toBe(432);
    });

    it('estMinutes = max(0.1, round(palabras/180, 1))', () => {
      expect(estimateMinutes(380)).toBe(2.1);
      expect(estimateMinutes(1)).toBe(0.1);
    });
  });

  it('no pierde ni inventa palabras', () => {
    const input = textOf(130, 220, 90, 310, 75, 400);
    const chunks = chunkText(input, 2.5);
    expect(chunks.reduce((n, c) => n + c.words, 0)).toBe(countWords(input));
    expect(chunks.map((c) => c.content).join(' ').replace(/\s+/g, ' ')).toBe(normalizeText(input).replace(/\s+/g, ' '));
  });
});
