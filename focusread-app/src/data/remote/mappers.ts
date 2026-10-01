// Único lugar donde se traduce snake_case (base de datos) ↔ camelCase (app). Cada fila se valida
// con zod DESPUÉS de mapearla: una fila inválida nunca llega a la UI.
import {
  ArticleSchema,
  ArticleWithDosesSchema,
  QuizQuestionSchema,
  ReadingSessionSchema,
  UserSettingsSchema,
  type Article,
  type ArticleWithDoses,
  type ReadingSession,
  type UserSettings,
} from '../../domain/contract';
import type { ArticleProgress } from '../../domain/ports';

type Row = Record<string, unknown>;

// Postgres (numeric) puede llegar como número o como texto según el cliente.
const num = (v: unknown): unknown => (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v)) ? Number(v) : v);

// Supabase devuelve timestamptz como "2026-09-30T12:00:00+00:00": el contrato acepta offsets.
export function articleRowToArticle(r: Row): Article {
  return ArticleSchema.parse({
    id: r.id,
    title: r.title,
    category: r.category ?? null,
    sourceType: r.source_type,
    sourceUrl: r.source_url ?? null,
    summaryPoints: r.summary_points ?? [],
    totalMinutes: num(r.total_minutes),
    doseCount: r.dose_count,
    bookmarked: r.bookmarked,
    aiProvider: r.ai_provider ?? null,
    aiModel: r.ai_model ?? null,
    createdAt: r.created_at,
  });
}

// `quiz_questions` puede llegar como objeto, como arreglo de 0..1 elementos o como null según cómo
// PostgREST resuelva la relación (la FK es única): se toleran las tres formas.
export function normalizeQuizRelation(value: unknown): Row | null {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) return (value[0] as Row | undefined) ?? null;
  return value as Row;
}

export function doseRowToDose(r: Row, articleId: string) {
  const q = normalizeQuizRelation(r.quiz_questions);
  const quiz = q
    ? QuizQuestionSchema.parse({
        id: q.id,
        question: q.question,
        options: q.options,
        correctIndex: q.correct_index,
        explanation: q.explanation ?? null,
      })
    : null;
  return {
    id: r.id,
    articleId: (r.article_id as string | undefined) ?? articleId,
    position: r.position,
    title: r.title ?? null,
    content: r.content,
    estMinutes: num(r.est_minutes),
    quiz,
  };
}

export function articleRowToArticleWithDoses(r: Row): ArticleWithDoses {
  const article = articleRowToArticle(r);
  const doses = ((r.doses as Row[] | undefined) ?? [])
    .map((d) => doseRowToDose(d, article.id))
    .sort((a, b) => (a.position as number) - (b.position as number));
  return ArticleWithDosesSchema.parse({ ...article, doses });
}

export function sessionRowToSession(r: Row): ReadingSession {
  return ReadingSessionSchema.parse({
    id: r.id,
    articleId: r.article_id ?? null,
    doseId: r.dose_id ?? null,
    startedAt: r.started_at,
    endedAt: r.ended_at,
    activeSeconds: r.active_seconds,
    completed: r.completed,
    quizCorrect: r.quiz_correct ?? null,
  });
}

// La app NO envía user_id: la base lo toma de auth.uid() (DEFAULT) y la RLS lo verifica.
export function sessionToRow(s: ReadingSession): Row {
  return {
    id: s.id,
    article_id: s.articleId,
    dose_id: s.doseId,
    started_at: s.startedAt,
    ended_at: s.endedAt,
    active_seconds: s.activeSeconds,
    completed: s.completed,
    quiz_correct: s.quizCorrect,
  };
}

export function progressRowToProgress(r: Row): ArticleProgress {
  return {
    articleId: r.article_id as string,
    completedDoses: Number(r.completed_doses ?? 0),
    lastReadAt: (r.last_read_at as string | null) ?? null,
  };
}

export function settingsRowToSettings(r: Row): { settings: UserSettings; updatedAt: string } {
  return {
    settings: UserSettingsSchema.parse({
      theme: r.theme,
      readerFontScale: num(r.reader_font_scale),
      targetDoseMinutes: num(r.target_dose_minutes),
      voiceId: r.voice_id ?? null,
      speechRate: num(r.speech_rate),
      speechPitch: num(r.speech_pitch),
      hapticsEnabled: r.haptics_enabled,
      quizEnabled: r.quiz_enabled,
      aiProvider: r.ai_provider,
      aiModel: r.ai_model ?? null,
    }),
    updatedAt: r.updated_at as string,
  };
}

// Solo las columnas de ajustes: `updated_at` la pone el trigger del servidor.
export function settingsToRow(s: UserSettings): Row {
  return {
    theme: s.theme,
    reader_font_scale: s.readerFontScale,
    target_dose_minutes: s.targetDoseMinutes,
    voice_id: s.voiceId,
    speech_rate: s.speechRate,
    speech_pitch: s.speechPitch,
    haptics_enabled: s.hapticsEnabled,
    quiz_enabled: s.quizEnabled,
    ai_provider: s.aiProvider,
    ai_model: s.aiModel,
  };
}
