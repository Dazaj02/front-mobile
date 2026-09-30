import { runMigrations } from './migrations';

// Subconjunto de expo-sqlite que usa la app; permite probar con sql.js en Jest.
export interface SqlDb {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params?: readonly (string | number | null)[]): Promise<unknown>;
  getAllAsync<T>(sql: string, params?: readonly (string | number | null)[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, params?: readonly (string | number | null)[]): Promise<T | null>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}

const DB_NAME = 'focusread.db';
let dbPromise: Promise<SqlDb> | null = null;

// Import dinámico: los módulos nativos solo se cargan cuando realmente se abre la base.
export function getDb(): Promise<SqlDb> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const SQLite = await import('expo-sqlite');
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
      const adapted = db as unknown as SqlDb;
      await runMigrations(adapted);
      return adapted;
    })().catch((e) => {
      dbPromise = null; // permite reintentar
      throw e;
    });
  }
  return dbPromise;
}

// Borra todos los datos locales (cierre de sesión / eliminar cuenta).
export async function clearLocalData(db: SqlDb): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const table of ['quiz_questions', 'doses', 'articles', 'reading_sessions', 'reading_sessions_outbox', 'settings']) {
      await db.runAsync(`DELETE FROM ${table}`);
    }
  });
}
