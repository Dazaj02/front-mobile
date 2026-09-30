import { ReadingSessionSchema, type ReadingSession } from '../../domain/contract';
import type { ArticleProgress, ProgressRepository } from '../../domain/ports';
import { logger } from '../../lib/logger';
import type { SqlDb } from './db';

interface SessionRow {
  id: string;
  article_id: string | null;
  dose_id: string | null;
  started_at: string;
  ended_at: string;
  active_seconds: number;
  completed: number;
  quiz_correct: number | null;
}

interface ProgressRow {
  article_id: string;
  completed_doses: number;
  last_read_at: string | null;
}

function rowToSession(r: SessionRow): ReadingSession {
  return ReadingSessionSchema.parse({
    id: r.id,
    articleId: r.article_id,
    doseId: r.dose_id,
    startedAt: r.started_at,
    endedAt: r.ended_at,
    activeSeconds: r.active_seconds,
    completed: r.completed === 1,
    quizCorrect: r.quiz_correct === null ? null : r.quiz_correct === 1,
  });
}

// Fuente de verdad en modo mock; caché en modo live.
export class LocalProgressRepository implements ProgressRepository {
  constructor(private readonly getDb: () => Promise<SqlDb>) {}

  // Idempotente por `id`: reenviar la misma sesión no la duplica.
  async recordSession(session: ReadingSession): Promise<void> {
    const s = ReadingSessionSchema.parse(session);
    const db = await this.getDb();
    await db.runAsync(
      `INSERT OR IGNORE INTO reading_sessions
         (id, article_id, dose_id, started_at, ended_at, active_seconds, completed, quiz_correct)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        s.id,
        s.articleId,
        s.doseId,
        s.startedAt,
        s.endedAt,
        s.activeSeconds,
        s.completed ? 1 : 0,
        s.quizCorrect === null ? null : s.quizCorrect ? 1 : 0,
      ],
    );
  }

  async listSessions(sinceIso: string): Promise<ReadingSession[]> {
    const db = await this.getDb();
    const rows = await db.getAllAsync<SessionRow>(
      'SELECT * FROM reading_sessions WHERE ended_at >= ? ORDER BY ended_at',
      [sinceIso],
    );
    const sessions: ReadingSession[] = [];
    for (const row of rows) {
      try {
        sessions.push(rowToSession(row));
      } catch (e) {
        logger.warn('Sesión local inválida, se omite', row.id, e);
      }
    }
    return sessions;
  }

  async articleProgress(): Promise<ArticleProgress[]> {
    const db = await this.getDb();
    const rows = await db.getAllAsync<ProgressRow>(
      `SELECT article_id,
              COUNT(DISTINCT CASE WHEN completed = 1 THEN dose_id END) AS completed_doses,
              MAX(ended_at) AS last_read_at
         FROM reading_sessions
        WHERE article_id IS NOT NULL
        GROUP BY article_id`,
    );
    return rows.map((r) => ({
      articleId: r.article_id,
      completedDoses: r.completed_doses,
      lastReadAt: r.last_read_at,
    }));
  }
}
