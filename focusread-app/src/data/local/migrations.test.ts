import { createTestDb } from '../../test/testDb';
import { getSchemaVersion, MIGRATIONS, runMigrations, type Migration } from './migrations';

describe('migraciones', () => {
  it('crean todas las tablas del plan y registran la versión', async () => {
    const db = await createTestDb();
    const tables = await db.getAllAsync<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name");
    const names = tables.map((t) => t.name);
    for (const t of ['articles', 'doses', 'quiz_questions', 'reading_sessions_outbox', 'settings', 'meta', 'reading_sessions']) {
      expect(names).toContain(t);
    }
    expect(await getSchemaVersion(db)).toBe(MIGRATIONS[MIGRATIONS.length - 1].version);
  });

  it('se aplican una sola vez (volver a ejecutar no falla ni borra datos)', async () => {
    const db = await createTestDb();
    await db.runAsync("INSERT INTO settings (id, data, updated_at) VALUES (1, '{}', 'x')");
    await runMigrations(db);
    await runMigrations(db);
    const row = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM settings');
    expect(row?.n).toBe(1);
  });

  it('solo corren las migraciones nuevas', async () => {
    const db = await createTestDb({ migrate: false });
    const m1: Migration = { version: 1, sql: 'CREATE TABLE a (id INTEGER);' };
    const m2: Migration = { version: 2, sql: 'CREATE TABLE b (id INTEGER);' };
    expect(await runMigrations(db, [m1])).toBe(1);
    expect(await runMigrations(db, [m1, m2])).toBe(2); // m1 no se repite (CREATE TABLE a fallaría)
    expect(await getSchemaVersion(db)).toBe(2);
  });

  it('una migración que falla se revierte por completo y no avanza la versión', async () => {
    const db = await createTestDb({ migrate: false });
    const ok: Migration = { version: 1, sql: 'CREATE TABLE a (id INTEGER);' };
    const bad: Migration = { version: 2, sql: 'CREATE TABLE b (id INTEGER); CREATE TABLE a (id INTEGER);' };
    await expect(runMigrations(db, [ok, bad])).rejects.toBeTruthy();
    expect(await getSchemaVersion(db)).toBe(1);
    const b = await db.getAllAsync("SELECT name FROM sqlite_master WHERE name = 'b'");
    expect(b).toHaveLength(0);
  });
});
