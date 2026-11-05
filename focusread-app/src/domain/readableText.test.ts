import { cleanForReading, parseListLine, toSpeech } from './readableText';

describe('cleanForReading', () => {
  it('quita citas y marcas de edición sin tocar el resto', () => {
    expect(cleanForReading('La neurona[1] es una célula[nota 2] del cerebro [editar].')).toBe('La neurona es una célula del cerebro.');
    expect(cleanForReading('El año [2024] cuenta.')).toBe('El año [2024] cuenta.');
  });

  it('une líneas partidas a mano pero respeta los párrafos', () => {
    const raw = 'Aprender en dosis cortas mejora la\nretención y reduce la fatiga.\n\nSegundo párrafo completo.';
    expect(cleanForReading(raw)).toBe('Aprender en dosis cortas mejora la retención y reduce la fatiga.\n\nSegundo párrafo completo.');
  });

  it('une una línea larga sin punto final con la siguiente aunque empiece en mayúscula', () => {
    expect(cleanForReading('Esta frase larga no termina aquí porque el texto original se partió y continúa\nCon un nombre propio y acaba.')).toBe(
      'Esta frase larga no termina aquí porque el texto original se partió y continúa Con un nombre propio y acaba.',
    );
  });

  it('un título corto sin punto no se pega al párrafo', () => {
    expect(cleanForReading('Introducción\nEl cerebro aprende por repetición.')).toBe('Introducción\n\nEl cerebro aprende por repetición.');
  });

  it('reconoce listas numeradas y con viñetas y une su continuación', () => {
    const raw = 'Pasos:\n1) Elige un texto\n2) Lee una dosis\ncorta y concentrada\n- Descansa\n- Repite';
    expect(cleanForReading(raw)).toBe('Pasos:\n\n1. Elige un texto\n2. Lee una dosis corta y concentrada\n\n• Descansa\n• Repite'.replace('\n\n• Descansa', '\n• Descansa'));
  });

  it('une guiones de fin de línea, ordena espacios y puntuación', () => {
    expect(cleanForReading('con-\ntinuar  la lectura , sin prisa ;y bien .')).toBe('continuar la lectura, sin prisa; y bien.');
  });

  it('es idempotente', () => {
    const raw = 'Título\nTexto[3] partido\nen líneas.\n\n1) Uno\n2) Dos';
    const once = cleanForReading(raw);
    expect(cleanForReading(once)).toBe(once);
  });
});

describe('parseListLine / toSpeech', () => {
  it('interpreta la línea de lista limpia', () => {
    expect(parseListLine('2. Lee una dosis')).toEqual({ marker: '2.', text: 'Lee una dosis' });
    expect(parseListLine('• Descansa')).toEqual({ marker: '•', text: 'Descansa' });
    expect(parseListLine('Texto normal')).toBeNull();
  });

  it('la voz no dice viñetas y marca pausa en cada elemento', () => {
    expect(toSpeech('Pasos:\n• Descansa\n• Repite.')).toBe('Pasos:\nDescansa.\nRepite.');
  });
});
