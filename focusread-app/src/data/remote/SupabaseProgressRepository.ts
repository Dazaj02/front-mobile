import type { ReadingSession } from '../../domain/contract';
import type { ArticleProgress, ProgressRepository } from '../../domain/ports';
import { logger } from '../../lib/logger';
import { progressRowToProgress, sessionRowToSession, sessionToRow } from './mappers';
import type { FocusReadSupabaseClient } from './supabaseClient';
import { toAppError } from './supabaseErrors';

const SESSION_COLUMNS = 'id, article_id, dose_id, started_at, ended_at, active_seconds, completed, quiz_correct';

export class SupabaseProgressRepository implements ProgressRepository {
  constructor(private readonly client: FocusReadSupabaseClient) {}

  // Idempotente: `ignoreDuplicates` = ON CONFLICT DO NOTHING por id (reenviar no duplica ni pisa).
  // Sin `user_id`: lo pone la base con auth.uid() y la RLS lo comprueba.
  async recordSession(session: ReadingSession): Promise<void> {
    const { error } = await this.client.from('reading_sessions').upsert(sessionToRow(session), { onConflict: 'id', ignoreDuplicates: true });
    if (error) throw toAppError(error);
  }

  async listSessions(sinceIso: string): Promise<ReadingSession[]> {
    const { data, error } = await this.client
      .from('reading_sessions')
      .select(SESSION_COLUMNS)
      .gte('ended_at', sinceIso)
      .order('ended_at', { ascending: true })
      .limit(5000);
    if (error) throw toAppError(error);
    const sessions: ReadingSession[] = [];
    for (const row of data ?? []) {
      try {
        sessions.push(sessionRowToSession(row as Record<string, unknown>));
      } catch (e) {
        logger.warn('Sesión remota inválida, se omite', (row as { id?: string }).id, e);
      }
    }
    return sessions;
  }

  async articleProgress(): Promise<ArticleProgress[]> {
    const { data, error } = await this.client.from('article_progress').select('article_id, completed_doses, last_read_at');
    if (error) throw toAppError(error);
    return (data ?? []).map((r) => progressRowToProgress(r as Record<string, unknown>));
  }
}
