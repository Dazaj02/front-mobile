import type { ReadingSession } from '../../domain/contract';
import type { ArticleProgress, ProgressRepository } from '../../domain/ports';
import { logger } from '../../lib/logger';
import type { LocalProgressRepository } from '../local/LocalProgressRepository';
import { isNetworkFailure } from './CachedArticleRepository';

// Las sesiones se escriben en el remoto SOLO desde la outbox (SyncService). Esta clase sirve las
// lecturas: con conexión del remoto (y refresca la caché local); sin conexión, de la caché.
export class CachedProgressRepository implements ProgressRepository {
  constructor(
    private readonly remote: ProgressRepository,
    private readonly cache: LocalProgressRepository,
    private readonly isOnline: () => boolean,
  ) {}

  // Envío directo al remoto (lo usa el flush de la outbox). Idempotente por id en el servidor.
  async recordSession(session: ReadingSession): Promise<void> {
    await this.remote.recordSession(session);
    await this.cache.recordSession(session);
  }

  async listSessions(sinceIso: string): Promise<ReadingSession[]> {
    if (this.isOnline()) {
      try {
        const sessions = await this.remote.listSessions(sinceIso);
        await Promise.all(sessions.map((s) => this.cache.recordSession(s)));
        return sessions;
      } catch (e) {
        if (!isNetworkFailure(e)) throw e;
        logger.warn('Remoto no disponible, sesiones desde la caché', e);
      }
    }
    return this.cache.listSessions(sinceIso);
  }

  async articleProgress(): Promise<ArticleProgress[]> {
    if (this.isOnline()) {
      try {
        return await this.remote.articleProgress();
      } catch (e) {
        if (!isNetworkFailure(e)) throw e;
      }
    }
    return this.cache.articleProgress();
  }
}
