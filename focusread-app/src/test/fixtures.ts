import { randomUUID } from 'crypto';

import type { ArticleWithDoses, ReadingSession } from '../domain/contract';

export interface ArticleOverrides {
  id?: string;
  title?: string;
  createdAt?: string;
  doseCount?: number;
  withQuiz?: boolean;
}

export function makeArticle(o: ArticleOverrides = {}): ArticleWithDoses {
  const id = o.id ?? randomUUID();
  const doseCount = o.doseCount ?? 2;
  return {
    id,
    title: o.title ?? 'Artículo de prueba',
    category: 'Pruebas',
    sourceType: 'text',
    sourceUrl: null,
    summaryPoints: ['Punto uno', 'Punto dos'],
    totalMinutes: doseCount * 2.5,
    doseCount,
    bookmarked: false,
    aiProvider: null,
    aiModel: null,
    createdAt: o.createdAt ?? '2026-09-01T10:00:00.000Z',
    doses: Array.from({ length: doseCount }, (_, position) => ({
      id: randomUUID(),
      articleId: id,
      position,
      title: `Dosis ${position + 1}`,
      content: `Contenido de la dosis ${position + 1}.`,
      estMinutes: 2.5,
      quiz:
        o.withQuiz !== false && position === doseCount - 1
          ? { id: randomUUID(), question: '¿Pregunta?', options: ['A', 'B', 'C'], correctIndex: 1, explanation: 'Porque B.' }
          : null,
    })),
  };
}

export function makeSession(o: Partial<ReadingSession> = {}): ReadingSession {
  return {
    id: randomUUID(),
    articleId: null,
    doseId: null,
    startedAt: '2026-09-30T15:00:00.000Z',
    endedAt: '2026-09-30T15:03:00.000Z',
    activeSeconds: 150,
    completed: true,
    quizCorrect: null,
    ...o,
  };
}

// Sesión cuyo fin ocurre a una hora LOCAL concreta (la zona horaria de Jest es fija).
export function sessionAtLocal(year: number, month: number, day: number, hour: number, minute: number, o: Partial<ReadingSession> = {}): ReadingSession {
  const end = new Date(year, month - 1, day, hour, minute);
  const start = new Date(end.getTime() - 3 * 60_000);
  return makeSession({ startedAt: start.toISOString(), endedAt: end.toISOString(), ...o });
}
