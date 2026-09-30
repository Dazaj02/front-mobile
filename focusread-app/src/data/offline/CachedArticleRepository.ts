import type { Article, ArticleWithDoses } from '../../domain/contract';
import type { ArticleFilter, ArticleRepository } from '../../domain/ports';
import { AppError, isAppError } from '../../lib/errors';
import { logger } from '../../lib/logger';
import type { LocalArticleRepository } from '../local/LocalArticleRepository';

export const ARTICLE_CACHE_LIMIT = 50;

// Online-first: con conexión lee del remoto y guarda en caché (SQLite, máx. 50 artículos por LRU con
// sus dosis y quiz); sin conexión o si el remoto no responde, lee de la caché. Las escrituras
// (favorito, borrar) requieren conexión.
export class CachedArticleRepository implements ArticleRepository {
  constructor(
    private readonly remote: ArticleRepository,
    private readonly cache: LocalArticleRepository,
    private readonly isOnline: () => boolean,
  ) {}

  async list(filter?: ArticleFilter): Promise<Article[]> {
    if (this.isOnline()) {
      try {
        return await this.remote.list(filter);
      } catch (e) {
        if (!isNetworkFailure(e)) throw e;
        logger.warn('Remoto no disponible, se usa la caché', e);
      }
    }
    return this.cache.list(filter);
  }

  async getWithDoses(id: string): Promise<ArticleWithDoses | null> {
    if (this.isOnline()) {
      try {
        const article = await this.remote.getWithDoses(id);
        if (article) await this.cache.save(article); // aplica el límite LRU
        return article;
      } catch (e) {
        if (!isNetworkFailure(e)) throw e;
        logger.warn('Remoto no disponible, se usa la caché', e);
      }
    }
    const cached = await this.cache.getWithDoses(id);
    if (!cached) throw new AppError('NOT_AVAILABLE_OFFLINE', 'Este artículo no está guardado para leer sin conexión');
    return cached;
  }

  async setBookmarked(id: string, value: boolean): Promise<void> {
    this.requireOnline();
    await this.remote.setBookmarked(id, value);
    await this.cache.setBookmarked(id, value);
  }

  async remove(id: string): Promise<void> {
    this.requireOnline();
    await this.remote.remove(id);
    await this.cache.remove(id);
  }

  private requireOnline(): void {
    if (!this.isOnline()) throw new AppError('NOT_AVAILABLE_OFFLINE', 'Esta acción requiere conexión');
  }
}

export function isNetworkFailure(e: unknown): boolean {
  return isAppError(e) && (e.code === 'NETWORK_ERROR' || e.code === 'CLIENT_TIMEOUT');
}
