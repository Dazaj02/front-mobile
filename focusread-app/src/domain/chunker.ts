// Algoritmo de fragmentación compartido con el backend (PLAN_FRONTEND §3.5).
import type { TargetDoseMinutesSchema } from './contract';
import type { z } from 'zod';

export const WORDS_PER_MINUTE = 180;
export const MAX_DOSES = 20;

const MIN_FILL = 0.85; // un fragmento se cierra al llegar a ≥ 0.85 × objetivo
const MAX_FILL = 1.3; // …sin pasar de 1.3 × objetivo (salvo unidad única)
const SPLIT_PARAGRAPH = 1.5; // un párrafo > 1.5 × objetivo se parte por oraciones
const MIN_TAIL = 0.4; // un último fragmento < 0.4 × objetivo se fusiona con el anterior

export type ChunkErrorCode = 'CONTENT_EMPTY' | 'CONTENT_TOO_LONG';

export class ChunkError extends Error {
  readonly code: ChunkErrorCode;
  readonly suggestedMinutes?: number;
  constructor(code: ChunkErrorCode, message: string, suggestedMinutes?: number) {
    super(message);
    this.name = 'ChunkError';
    this.code = code;
    this.suggestedMinutes = suggestedMinutes;
  }
}

export interface Chunk {
  content: string;
  words: number;
  estMinutes: number;
}

export function countWords(text: string): number {
  const t = text.trim();
  return t === '' ? 0 : t.split(/\s+/).length;
}

// Quita caracteres de control, colapsa espacios y conserva los saltos de párrafo.
export function normalizeText(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/[ \t ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function estimateMinutes(words: number): number {
  return Math.max(0.1, Math.round((words / WORDS_PER_MINUTE) * 10) / 10);
}

interface Unit {
  text: string;
  words: number;
  sep: string; // separador con la unidad anterior
}

function splitSentences(paragraph: string): string[] {
  const parts = paragraph.match(/[^.!?…]+(?:[.!?…]+["')\]»”]*)?\s*/g) ?? [paragraph];
  return parts.map((s) => s.trim()).filter(Boolean);
}

function toUnits(text: string, targetWords: number): Unit[] {
  const units: Unit[] = [];
  const paragraphs = text.split(/\n{2,}/).map((p) => p.replace(/\n/g, ' ').trim()).filter(Boolean);
  for (const p of paragraphs) {
    const words = countWords(p);
    if (words > SPLIT_PARAGRAPH * targetWords) {
      splitSentences(p).forEach((s, i) => units.push({ text: s, words: countWords(s), sep: i === 0 ? '\n\n' : ' ' }));
    } else {
      units.push({ text: p, words, sep: '\n\n' });
    }
  }
  if (units.length > 0) units[0].sep = '';
  return units;
}

type DoseMinutes = z.infer<typeof TargetDoseMinutesSchema>;
const DOSE_OPTIONS: readonly DoseMinutes[] = [1.5, 2.5, 3.5];

function buildGroups(text: string, targetDoseMinutes: DoseMinutes): Unit[][] {
  const target = targetDoseMinutes * WORDS_PER_MINUTE;
  const units = toUnits(text, target);

  const groups: Unit[][] = [];
  let current: Unit[] = [];
  let currentWords = 0;
  for (const u of units) {
    if (current.length === 0) {
      current = [u];
      currentWords = u.words;
    } else if (currentWords >= MIN_FILL * target || currentWords + u.words > MAX_FILL * target) {
      groups.push(current);
      current = [u];
      currentWords = u.words;
    } else {
      current.push(u);
      currentWords += u.words;
    }
  }
  if (current.length > 0) groups.push(current);

  // El último fragmento muy corto se fusiona con el anterior.
  if (groups.length > 1) {
    const last = groups[groups.length - 1];
    const lastWords = last.reduce((n, u) => n + u.words, 0);
    if (lastWords < MIN_TAIL * target) {
      groups.pop();
      groups[groups.length - 1].push(...last);
    }
  }

  return groups;
}

export function chunkText(rawText: string, targetDoseMinutes: DoseMinutes): Chunk[] {
  const text = normalizeText(rawText);
  if (countWords(text) === 0) throw new ChunkError('CONTENT_EMPTY', 'El texto está vacío');

  const groups = buildGroups(text, targetDoseMinutes);
  if (groups.length > MAX_DOSES) {
    // Se sugiere la menor duración mayor con la que el texto sí cabe en 20 dosis.
    const suggested = DOSE_OPTIONS.find((m) => m > targetDoseMinutes && buildGroups(text, m).length <= MAX_DOSES);
    throw new ChunkError(
      'CONTENT_TOO_LONG',
      suggested
        ? `El texto genera más de ${MAX_DOSES} dosis; prueba con dosis de ${suggested} min`
        : `El texto genera más de ${MAX_DOSES} dosis`,
      suggested,
    );
  }

  return groups.map((g) => {
    const content = g.map((u, i) => (i === 0 ? '' : u.sep) + u.text).join('');
    const words = countWords(content);
    return { content, words, estMinutes: estimateMinutes(words) };
  });
}
