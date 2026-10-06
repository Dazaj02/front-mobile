import type { Article } from '../../domain/contract';
import type { ArticleProgress } from '../../domain/ports';

export type LibraryFilter = 'all' | 'inProgress' | 'saved' | 'completed' | 'short';
export const LIBRARY_FILTERS: readonly LibraryFilter[] = ['all', 'inProgress', 'saved', 'completed', 'short'];
export const SHORT_ARTICLE_MINUTES = 3;

export interface LibraryItem {
  article: Article;
  completedDoses: number;
  progress: number; // 0–1
  lastReadAt: string | null;
}

export function toLibraryItems(articles: readonly Article[], progress: readonly ArticleProgress[]): LibraryItem[] {
  const byId = new Map(progress.map((p) => [p.articleId, p]));
  return articles.map((article) => {
    const p = byId.get(article.id);
    const completedDoses = Math.min(p?.completedDoses ?? 0, article.doseCount);
    return {
      article,
      completedDoses,
      progress: article.doseCount > 0 ? completedDoses / article.doseCount : 0,
      lastReadAt: p?.lastReadAt ?? null,
    };
  });
}

export const isCompleted = (i: LibraryItem) => i.completedDoses >= i.article.doseCount;
export const isInProgress = (i: LibraryItem) => i.completedDoses > 0 && !isCompleted(i);

// Búsqueda sin distinguir mayúsculas ni acentos.
const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function applyFilter(items: readonly LibraryItem[], filter: LibraryFilter, query = '', category: string | null = null): LibraryItem[] {
  const q = normalize(query.trim());
  return items.filter((i) => {
    if (category && i.article.category !== category) return false;
    if (q && !normalize(`${i.article.title} ${i.article.category ?? ''}`).includes(q)) return false;
    switch (filter) {
      case 'inProgress':
        return isInProgress(i);
      case 'saved':
        return i.article.bookmarked;
      case 'completed':
        return isCompleted(i);
      case 'short':
        return i.article.totalMinutes < SHORT_ARTICLE_MINUTES;
      default:
        return true;
    }
  });
}

// El artículo en curso leído más recientemente.
export function pickContinueReading(items: readonly LibraryItem[]): LibraryItem | null {
  const inProgress = items.filter(isInProgress);
  if (inProgress.length === 0) return null;
  return [...inProgress].sort((a, b) => (b.lastReadAt ?? '').localeCompare(a.lastReadAt ?? ''))[0];
}

// Primera dosis pendiente (o la última si ya terminó).
export function nextDoseIndex(item: LibraryItem): number {
  return Math.min(item.completedDoses, item.article.doseCount - 1);
}

// Aplica las categorías elegidas por el usuario sobre las del servidor.
export function withCategories(items: readonly LibraryItem[], overrides: Readonly<Record<string, string>>): LibraryItem[] {
  return items.map((i) => (overrides[i.article.id] ? { ...i, article: { ...i.article, category: overrides[i.article.id] } } : i));
}

// Categorías presentes en la biblioteca, en orden alfabético.
export function listCategories(items: readonly LibraryItem[]): string[] {
  return [...new Set(items.map((i) => i.article.category).filter((c): c is string => Boolean(c)))].sort((a, b) => a.localeCompare(b, 'es'));
}
