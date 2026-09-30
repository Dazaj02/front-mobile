import {
  ArticleSchema,
  ArticleWithDosesSchema,
  MicroDoseSchema,
  QuizQuestionSchema,
  type Article,
  type ArticleWithDoses,
} from '../../domain/contract';
import type { ArticleFilter, ArticleRepository } from '../../domain/ports';
import { logger } from '../../lib/logger';
import type { SqlDb } from './db';

interface ArticleRow {
  id: string;
  title: string;
  category: string | null;
  source_type: string;
  source_url: string | null;
  summary_points: string;
  total_minutes: number;
  dose_count: number;
  bookmarked: number;
  ai_provider: string | null;
  ai_model: string | null;
  created_at: string;
}

interface DoseRow {
  id: string;
  article_id: string;
  position: number;
  title: string | null;
  content: string;
  est_minutes: number;
  q_id: string | null;
  q_question: string | null;
  q_options: string | null;
  q_correct: number | null;
  q_explanation: string | null;
}

export interface LocalArticleRepositoryOptions {
  // Solo en modo live (caché): máximo de artículos guardados, con expulsión LRU.
  cacheLimit?: number;
  now?: () => number;
}

function parseJson(text: string | null | undefined, fallback: unknown): unknown {
  if (!text) return fallback;
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

function rowToArticle(r: ArticleRow): Article {
  return ArticleSchema.parse({
    id: r.id,
    title: r.title,
    category: r.category,
    sourceType: r.source_type,
    sourceUrl: r.source_url,
    summaryPoints: parseJson(r.summary_points, []),
    totalMinutes: r.total_minutes,
    doseCount: r.dose_count,
    bookmarked: r.bookmarked === 1,
    aiProvider: r.ai_provider,
    aiModel: r.ai_model,
    createdAt: r.created_at,
  });
}

function rowToDose(r: DoseRow) {
  const quiz = r.q_id
    ? QuizQuestionSchema.parse({
        id: r.q_id,
        question: r.q_question,
        options: parseJson(r.q_options, []),
        correctIndex: r.q_correct,
        explanation: r.q_explanation,
      })
    : null;
  return MicroDoseSchema.parse({
    id: r.id,
    articleId: r.article_id,
    position: r.position,
    title: r.title,
    content: r.content,
    estMinutes: r.est_minutes,
    quiz,
  });
}

// Fuente de verdad en modo mock; caché (con LRU) en modo live.
export class LocalArticleRepository implements ArticleRepository {
  private readonly now: () => number;

  constructor(
    private readonly getDb: () => Promise<SqlDb>,
    private readonly options: LocalArticleRepositoryOptions = {},
  ) {
    this.now = options.now ?? Date.now;
  }

  async list(filter: ArticleFilter = {}): Promise<Article[]> {
    const db = await this.getDb();
    const where: string[] = [];
    const params: (string | number)[] = [];
    if (filter.query?.trim()) {
      where.push("title LIKE ? ESCAPE '\\'");
      params.push(`%${filter.query.trim().replace(/[\\%_]/g, '\\$&')}%`);
    }
    if (filter.bookmarkedOnly) where.push('bookmarked = 1');
    const rows = await db.getAllAsync<ArticleRow>(
      `SELECT * FROM articles ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY created_at DESC`,
      params,
    );
    const articles: Article[] = [];
    for (const row of rows) {
      try {
        articles.push(rowToArticle(row));
      } catch (e) {
        logger.warn('Fila de artículo inválida, se omite', row.id, e);
      }
    }
    return articles;
  }

  async getWithDoses(id: string): Promise<ArticleWithDoses | null> {
    const db = await this.getDb();
    const row = await db.getFirstAsync<ArticleRow>('SELECT * FROM articles WHERE id = ?', [id]);
    if (!row) return null;
    const doseRows = await db.getAllAsync<DoseRow>(
      `SELECT d.id, d.article_id, d.position, d.title, d.content, d.est_minutes,
              q.id AS q_id, q.question AS q_question, q.options AS q_options,
              q.correct_index AS q_correct, q.explanation AS q_explanation
         FROM doses d LEFT JOIN quiz_questions q ON q.dose_id = d.id
        WHERE d.article_id = ? ORDER BY d.position`,
      [id],
    );
    await db.runAsync('UPDATE articles SET last_opened_at = ? WHERE id = ?', [this.now(), id]);
    return ArticleWithDosesSchema.parse({ ...rowToArticle(row), doses: doseRows.map(rowToDose) });
  }

  // Guarda (o reemplaza) un artículo completo de forma atómica.
  async save(article: ArticleWithDoses): Promise<void> {
    const parsed = ArticleWithDosesSchema.parse(article);
    const db = await this.getDb();
    await db.withTransactionAsync(async () => {
      await db.runAsync('DELETE FROM articles WHERE id = ?', [parsed.id]); // cascada a dosis y quiz
      await db.runAsync(
        `INSERT INTO articles (id, title, category, source_type, source_url, summary_points, total_minutes,
                               dose_count, bookmarked, ai_provider, ai_model, created_at, last_opened_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          parsed.id,
          parsed.title,
          parsed.category,
          parsed.sourceType,
          parsed.sourceUrl,
          JSON.stringify(parsed.summaryPoints),
          parsed.totalMinutes,
          parsed.doseCount,
          parsed.bookmarked ? 1 : 0,
          parsed.aiProvider,
          parsed.aiModel,
          parsed.createdAt,
          this.now(),
        ],
      );
      for (const d of parsed.doses) {
        await db.runAsync(
          'INSERT INTO doses (id, article_id, position, title, content, est_minutes) VALUES (?, ?, ?, ?, ?, ?)',
          [d.id, parsed.id, d.position, d.title, d.content, d.estMinutes],
        );
        if (d.quiz) {
          await db.runAsync(
            'INSERT INTO quiz_questions (id, dose_id, question, options, correct_index, explanation) VALUES (?, ?, ?, ?, ?, ?)',
            [d.quiz.id, d.id, d.quiz.question, JSON.stringify(d.quiz.options), d.quiz.correctIndex, d.quiz.explanation],
          );
        }
      }
    });
    if (this.options.cacheLimit) await this.evictBeyond(this.options.cacheLimit);
  }

  async setBookmarked(id: string, value: boolean): Promise<void> {
    const db = await this.getDb();
    await db.runAsync('UPDATE articles SET bookmarked = ? WHERE id = ?', [value ? 1 : 0, id]);
  }

  async remove(id: string): Promise<void> {
    const db = await this.getDb();
    await db.runAsync('DELETE FROM articles WHERE id = ?', [id]);
  }

  // LRU por último acceso; los guardados no se expulsan antes que los demás (regla simple del plan).
  async evictBeyond(limit: number): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(
      `DELETE FROM articles WHERE id IN (
         SELECT id FROM articles ORDER BY last_opened_at DESC LIMIT -1 OFFSET ?)`,
      [limit],
    );
  }
}
