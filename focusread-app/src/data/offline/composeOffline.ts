import type { ArticleRepository, ProgressRepository } from '../../domain/ports';
import { SyncService } from '../../services/sync/SyncService';
import { LocalArticleRepository } from '../local/LocalArticleRepository';
import type { SqlDb } from '../local/db';
import { LocalProgressRepository } from '../local/LocalProgressRepository';
import { Outbox } from '../local/outbox';
import { LocalSettingsRepository } from '../local/settingsCache';
import { ARTICLE_CACHE_LIMIT, CachedArticleRepository } from './CachedArticleRepository';
import { CachedProgressRepository } from './CachedProgressRepository';
import { SyncedSettingsRepository, type RemoteSettings } from './SyncedSettingsRepository';

export interface RemoteAdapters {
  articles: ArticleRepository;
  progress: ProgressRepository;
  settings: RemoteSettings;
}

// Une los adaptadores remotos (Supabase en F8; FakeRemote en pruebas) con la caché SQLite, la outbox
// y el servicio de sincronización. El contenedor live solo tiene que pasar el remoto.
export function composeOffline(getDb: () => Promise<SqlDb>, remote: RemoteAdapters, isOnline: () => boolean) {
  const cacheArticles = new LocalArticleRepository(getDb, { cacheLimit: ARTICLE_CACHE_LIMIT });
  const cacheProgress = new LocalProgressRepository(getDb);
  const localSettings = new LocalSettingsRepository(getDb);
  const outbox = new Outbox(getDb);

  const articles = new CachedArticleRepository(remote.articles, cacheArticles, isOnline);
  const progress = new CachedProgressRepository(remote.progress, cacheProgress, isOnline);
  const settings = new SyncedSettingsRepository(localSettings, remote.settings, isOnline);
  // El flush envía por `progress` (remoto + caché local) para que lo enviado quede también en la caché.
  const sync = new SyncService({ outbox, remote: progress, isOnline });

  return { articles, progress, settings, sync, outbox, localArticles: cacheArticles };
}
