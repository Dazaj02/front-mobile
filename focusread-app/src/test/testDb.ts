// Soporte de pruebas: SqlDb sobre sql.js (SQLite en JS puro) con la misma interfaz que expo-sqlite.
import type { Database, SqlJsStatic } from 'sql.js';

import type { SqlDb } from '../data/local/db';
import { runMigrations, type Migration } from '../data/local/migrations';

let sqlPromise: Promise<SqlJsStatic> | null = null;

async function loadSql(): Promise<SqlJsStatic> {
  if (!sqlPromise) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const initSqlJs = require('sql.js/dist/sql-asm.js') as () => Promise<SqlJsStatic>;
    sqlPromise = initSqlJs();
  }
  return sqlPromise;
}

type Params = readonly (string | number | null)[];

export class TestDb implements SqlDb {
  constructor(readonly raw: Database) {}

  async execAsync(sql: string): Promise<void> {
    this.raw.exec(sql);
  }

  async runAsync(sql: string, params: Params = []): Promise<void> {
    this.raw.run(sql, params as (string | number | null)[]);
  }

  async getAllAsync<T>(sql: string, params: Params = []): Promise<T[]> {
    const stmt = this.raw.prepare(sql);
    try {
      stmt.bind(params as (string | number | null)[]);
      const rows: T[] = [];
      while (stmt.step()) rows.push(stmt.getAsObject() as T);
      return rows;
    } finally {
      stmt.free();
    }
  }

  async getFirstAsync<T>(sql: string, params: Params = []): Promise<T | null> {
    return (await this.getAllAsync<T>(sql, params))[0] ?? null;
  }

  async withTransactionAsync(task: () => Promise<void>): Promise<void> {
    this.raw.run('BEGIN');
    try {
      await task();
      this.raw.run('COMMIT');
    } catch (e) {
      this.raw.run('ROLLBACK');
      throw e;
    }
  }

  // Contenido completo del archivo SQLite como texto, para buscar secretos filtrados.
  dumpAsText(): string {
    return Buffer.from(this.raw.export()).toString('latin1');
  }
}

export async function createTestDb(options: { migrate?: boolean; migrations?: readonly Migration[] } = {}): Promise<TestDb> {
  const SQL = await loadSql();
  const db = new TestDb(new SQL.Database());
  db.raw.run('PRAGMA foreign_keys = ON');
  if (options.migrate !== false) await runMigrations(db, options.migrations);
  return db;
}
