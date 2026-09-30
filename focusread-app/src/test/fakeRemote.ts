import type { RemoteAdapters } from '../data/offline/composeOffline';
import type { Article, ArticleWithDoses, ReadingSession, UserSettings } from '../domain/contract';
import type { ArticleProgress, ArticleRepository, ProgressRepository } from '../domain/ports';
import { AppError } from '../lib/errors';

// Servidor simulado para las pruebas de offline/sincronización. Reproduce lo que hace Supabase:
//  - las sesiones se insertan con "upsert ignoreDuplicates" por id (reenviar no duplica);
//  - puede perder la red (online = false) o fallar N llamadas seguidas (failNext).
export class FakeRemote {
  online = true;
  failNext = 0;
  readonly articles = new Map<string, ArticleWithDoses>();
  readonly sessions = new Map<string, ReadingSession>();
  settings: { settings: UserSettings; updatedAt: string } | null = null;
  calls = { recordSession: 0, duplicateSessions: 0, listArticles: 0, getArticle: 0, setBookmarked: 0, remove: 0, settingsGet: 0, settingsPut: 0 };

  private guard(): void {
    if (!this.online) throw new AppError('NETWORK_ERROR', 'sin red (simulado)');
    if (this.failNext > 0) {
      this.failNext--;
      throw new AppError('NETWORK_ERROR', 'fallo temporal (simulado)');
    }
  }

  readonly articleRepo: ArticleRepository = {
    list: async () => {
      this.guard();
      this.calls.listArticles++;
      return [...this.articles.values()].map(({ doses: _d, ...a }): Article => a);
    },
    getWithDoses: async (id) => {
      this.guard();
      this.calls.getArticle++;
      return this.articles.get(id) ?? null;
    },
    setBookmarked: async (id, value) => {
      this.guard();
      this.calls.setBookmarked++;
      const a = this.articles.get(id);
      if (a) this.articles.set(id, { ...a, bookmarked: value });
    },
    remove: async (id) => {
      this.guard();
      this.calls.remove++;
      this.articles.delete(id);
    },
  };

  readonly progressRepo: ProgressRepository = {
    recordSession: async (session) => {
      this.guard();
      this.calls.recordSession++;
      if (this.sessions.has(session.id)) this.calls.duplicateSessions++;
      else this.sessions.set(session.id, session); // ignoreDuplicates
    },
    listSessions: async (sinceIso) => {
      this.guard();
      return [...this.sessions.values()].filter((s) => s.endedAt >= sinceIso);
    },
    articleProgress: async (): Promise<ArticleProgress[]> => {
      this.guard();
      const byArticle = new Map<string, { doses: Set<string>; last: string }>();
      for (const s of this.sessions.values()) {
        if (!s.articleId) continue;
        const e = byArticle.get(s.articleId) ?? { doses: new Set<string>(), last: s.endedAt };
        if (s.completed && s.doseId) e.doses.add(s.doseId);
        if (s.endedAt > e.last) e.last = s.endedAt;
        byArticle.set(s.articleId, e);
      }
      return [...byArticle].map(([articleId, e]) => ({ articleId, completedDoses: e.doses.size, lastReadAt: e.last }));
    },
  };

  readonly settingsRemote = {
    get: async () => {
      this.guard();
      this.calls.settingsGet++;
      return this.settings;
    },
    put: async (settings: UserSettings, updatedAt: string) => {
      this.guard();
      this.calls.settingsPut++;
      this.settings = { settings, updatedAt };
    },
  };

  adapters(): RemoteAdapters {
    return { articles: this.articleRepo, progress: this.progressRepo, settings: this.settingsRemote };
  }
}
