// TRANSITORIO (F4): importar en la app vieja sin llamar a ninguna IA desde el dispositivo.
// Usa el fragmentador local (solo texto, sin contenido inventado) y mapea al modelo antiguo.
// Se elimina cuando F6 reescriba la pantalla de importación.
import { chunkText, ChunkError } from '../domain/chunker';
import { titleFromText, URL_NEEDS_SERVER_MESSAGE } from '../data/mock/LocalChunkerGateway';
import type { Article, AppSettings, MicroDose } from '../types';

const MIN_CHARS = 300;

export function importArticleLegacy(input: string, settings: AppSettings): Article {
  const text = input.trim();
  if (/^https?:\/\//i.test(text)) throw new Error(URL_NEEDS_SERVER_MESSAGE);
  if (text.length < MIN_CHARS) throw new Error(`El texto debe tener al menos ${MIN_CHARS} caracteres`);

  const target = settings.targetDurationMinutes === 1.5 || settings.targetDurationMinutes === 3.5 ? settings.targetDurationMinutes : 2.5;
  let chunks;
  try {
    chunks = chunkText(text, target);
  } catch (e) {
    throw new Error(e instanceof ChunkError ? e.message : 'No se pudo procesar el texto');
  }

  const id = `art-${Date.now()}`;
  const microDoses: MicroDose[] = chunks.map((c, i) => ({
    id: `dose-${id}-${i + 1}`,
    articleId: id,
    sequenceOrder: i + 1,
    title: `Dosis ${i + 1}`,
    contentChunk: c.content,
    wordCount: c.words,
    estimatedSeconds: Math.round(c.estMinutes * 60),
    isCompleted: false,
  }));
  return {
    id,
    sourceUrl: '',
    title: titleFromText(text),
    author: 'Texto importado',
    category: 'Importado',
    fullCleanText: text,
    executiveSummary: [],
    totalReadingTimeSeconds: microDoses.reduce((n, d) => n + d.estimatedSeconds, 0),
    isFavorite: false,
    createdAt: Date.now(),
    microDoses,
  };
}
