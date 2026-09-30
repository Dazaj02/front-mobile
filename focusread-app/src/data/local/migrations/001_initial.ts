import type { Migration } from '.';

export const migration001: Migration = {
  version: 1,
  sql: `
    CREATE TABLE articles (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      category TEXT,
      source_type TEXT NOT NULL,
      source_url TEXT,
      summary_points TEXT NOT NULL DEFAULT '[]',
      total_minutes REAL NOT NULL,
      dose_count INTEGER NOT NULL,
      bookmarked INTEGER NOT NULL DEFAULT 0,
      ai_provider TEXT,
      ai_model TEXT,
      created_at TEXT NOT NULL,
      last_opened_at INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX idx_articles_created ON articles (created_at DESC);

    CREATE TABLE doses (
      id TEXT PRIMARY KEY NOT NULL,
      article_id TEXT NOT NULL REFERENCES articles (id) ON DELETE CASCADE,
      position INTEGER NOT NULL,
      title TEXT,
      content TEXT NOT NULL,
      est_minutes REAL NOT NULL,
      UNIQUE (article_id, position)
    );

    CREATE TABLE quiz_questions (
      id TEXT PRIMARY KEY NOT NULL,
      dose_id TEXT NOT NULL UNIQUE REFERENCES doses (id) ON DELETE CASCADE,
      question TEXT NOT NULL,
      options TEXT NOT NULL,
      correct_index INTEGER NOT NULL,
      explanation TEXT
    );

    -- Sesiones ya conocidas localmente. En modo mock son la fuente de verdad;
    -- en modo live son una caché de lo que hay en Supabase.
    CREATE TABLE reading_sessions (
      id TEXT PRIMARY KEY NOT NULL,
      article_id TEXT,
      dose_id TEXT,
      started_at TEXT NOT NULL,
      ended_at TEXT NOT NULL,
      active_seconds INTEGER NOT NULL,
      completed INTEGER NOT NULL,
      quiz_correct INTEGER
    );
    CREATE INDEX idx_sessions_ended ON reading_sessions (ended_at);

    -- Sesiones pendientes de enviar al servidor (live).
    CREATE TABLE reading_sessions_outbox (
      id TEXT PRIMARY KEY NOT NULL,
      payload TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      next_attempt_at INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE settings (
      id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `,
};
