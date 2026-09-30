import { ReadingSessionSchema, type ReadingSession } from '../../domain/contract';
import { logger } from '../../lib/logger';
import type { SqlDb } from './db';

export interface OutboxEntry {
  session: ReadingSession;
  attempts: number;
  nextAttemptAt: number;
}

interface OutboxRow {
  id: string;
  payload: string;
  attempts: number;
  next_attempt_at: number;
}

const BASE_DELAY_MS = 2_000;
const MAX_DELAY_MS = 15 * 60_000;

// Backoff exponencial: 2 s, 4 s, 8 s… hasta 15 min.
export function backoffDelayMs(attempts: number): number {
  return Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** Math.max(0, attempts - 1));
}

// Cola local de sesiones pendientes de sincronizar. F7 añade el `flush` contra el remoto.
export class Outbox {
  constructor(
    private readonly getDb: () => Promise<SqlDb>,
    private readonly now: () => number = Date.now,
  ) {}

  async enqueue(session: ReadingSession): Promise<void> {
    const s = ReadingSessionSchema.parse(session);
    const db = await this.getDb();
    await db.runAsync(
      'INSERT OR IGNORE INTO reading_sessions_outbox (id, payload, attempts, next_attempt_at, created_at) VALUES (?, ?, 0, 0, ?)',
      [s.id, JSON.stringify(s), this.now()],
    );
  }

  async all(): Promise<OutboxEntry[]> {
    const db = await this.getDb();
    const rows = await db.getAllAsync<OutboxRow>('SELECT * FROM reading_sessions_outbox ORDER BY created_at');
    const entries: OutboxEntry[] = [];
    for (const r of rows) {
      const parsed = ReadingSessionSchema.safeParse(safeJson(r.payload));
      if (parsed.success) {
        entries.push({ session: parsed.data, attempts: r.attempts, nextAttemptAt: r.next_attempt_at });
      } else {
        logger.warn('Entrada de outbox inválida, se descarta', r.id);
        await db.runAsync('DELETE FROM reading_sessions_outbox WHERE id = ?', [r.id]);
      }
    }
    return entries;
  }

  async due(): Promise<OutboxEntry[]> {
    const t = this.now();
    return (await this.all()).filter((e) => e.nextAttemptAt <= t);
  }

  async count(): Promise<number> {
    const db = await this.getDb();
    const row = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM reading_sessions_outbox');
    return row?.n ?? 0;
  }

  // Solo se llama tras una respuesta OK del servidor.
  async remove(id: string): Promise<void> {
    const db = await this.getDb();
    await db.runAsync('DELETE FROM reading_sessions_outbox WHERE id = ?', [id]);
  }

  async markFailed(id: string): Promise<void> {
    const db = await this.getDb();
    const row = await db.getFirstAsync<{ attempts: number }>('SELECT attempts FROM reading_sessions_outbox WHERE id = ?', [id]);
    if (!row) return;
    const attempts = row.attempts + 1;
    await db.runAsync('UPDATE reading_sessions_outbox SET attempts = ?, next_attempt_at = ? WHERE id = ?', [
      attempts,
      this.now() + backoffDelayMs(attempts),
      id,
    ]);
  }
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
