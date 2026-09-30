import type { SqlDb } from '../db';
import { migration001 } from './001_initial';

export interface Migration {
  version: number;
  sql: string;
}

// Las migraciones son versionadas e inmutables: para cambiar el esquema se añade una nueva.
export const MIGRATIONS: readonly Migration[] = [migration001];

export async function getSchemaVersion(db: SqlDb): Promise<number> {
  await db.execAsync('CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);');
  const row = await db.getFirstAsync<{ value: string }>("SELECT value FROM meta WHERE key = 'schema_version'");
  return row ? Number(row.value) : 0;
}

// Cada migración pendiente corre en su propia transacción y se registra en `meta`.
export async function runMigrations(db: SqlDb, migrations: readonly Migration[] = MIGRATIONS): Promise<number> {
  let version = await getSchemaVersion(db);
  for (const m of [...migrations].sort((a, b) => a.version - b.version)) {
    if (m.version <= version) continue;
    await db.withTransactionAsync(async () => {
      await db.execAsync(m.sql);
      await db.runAsync("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', ?)", [String(m.version)]);
    });
    version = m.version;
  }
  return version;
}
