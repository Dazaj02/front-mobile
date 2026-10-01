import type { Article, ArticleWithDoses } from '../../domain/contract';
import type { ArticleFilter, ArticleRepository } from '../../domain/ports';
import { articleRowToArticle, articleRowToArticleWithDoses } from './mappers';
import type { FocusReadSupabaseClient } from './supabaseClient';
import { toAppError } from './supabaseErrors';
import { logger } from '../../lib/logger';

const ARTICLE_COLUMNS =
  'id, title, category, source_type, source_url, summary_points, total_minutes, dose_count, bookmarked, ai_provider, ai_model, created_at';

// Solo lectura, favorito y borrado: la app NO inserta artículos (los crea la API con una RPC atómica).
// RLS garantiza que solo se ven y tocan los artículos propios.
export class SupabaseArticleRepository implements ArticleRepository {
  constructor(private readonly client: FocusReadSupabaseClient) {}

  async list(filter: ArticleFilter = {}): Promise<Article[]> {
    let query = this.client.from('articles').select(ARTICLE_COLUMNS).order('created_at', { ascending: false });
    if (filter.bookmarkedOnly) query = query.eq('bookmarked', true);
    if (filter.query?.trim()) query = query.ilike('title', `%${filter.query.trim().replace(/[\\%_]/g, '\\$&')}%`);
    const { data, error } = await query;
    if (error) throw toAppError(error);
    const articles: Article[] = [];
    for (const row of data ?? []) {
      try {
        articles.push(articleRowToArticle(row as Record<string, unknown>));
      } catch (e) {
        logger.warn('Fila de artículo inválida, se omite', (row as { id?: string }).id, e);
      }
    }
    return articles;
  }

  async getWithDoses(id: string): Promise<ArticleWithDoses | null> {
    const { data, error } = await this.client
      .from('articles')
      .select(`${ARTICLE_COLUMNS}, doses(id, article_id, position, title, content, est_minutes, quiz_questions(id, question, options, correct_index, explanation))`)
      .eq('id', id)
      .maybeSingle();
    if (error) throw toAppError(error);
    return data ? articleRowToArticleWithDoses(data as Record<string, unknown>) : null;
  }

  async setBookmarked(id: string, value: boolean): Promise<void> {
    const { error } = await this.client.from('articles').update({ bookmarked: value }).eq('id', id);
    if (error) throw toAppError(error);
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.client.from('articles').delete().eq('id', id);
    if (error) throw toAppError(error);
  }
}
