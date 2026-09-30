import { DEFAULT_SETTINGS } from '../../domain/defaults';
import { createTestDb, type TestDb } from '../../test/testDb';
import { makeArticle, makeSession } from '../../test/fixtures';
import { LocalArticleRepository } from './LocalArticleRepository';
import { LocalProgressRepository } from './LocalProgressRepository';
import { backoffDelayMs, Outbox } from './outbox';
import { LocalSettingsRepository } from './settingsCache';

let db: TestDb;
const getDb = async () => db;

beforeEach(async () => {
  db = await createTestDb();
});

const count = async (table: string) => (await db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM ${table}`))?.n;

describe('LocalArticleRepository', () => {
  it('guarda y recupera un artículo completo con dosis y quiz', async () => {
    const repo = new LocalArticleRepository(getDb);
    const article = makeArticle({ doseCount: 3 });
    await repo.save(article);
    const loaded = await repo.getWithDoses(article.id);
    expect(loaded).toEqual(article);
    expect(loaded?.doses.map((d) => d.position)).toEqual([0, 1, 2]);
    expect(loaded?.doses[2].quiz?.options).toEqual(['A', 'B', 'C']);
  });

  it('guardar de nuevo el mismo id reemplaza (sin duplicar dosis)', async () => {
    const repo = new LocalArticleRepository(getDb);
    const article = makeArticle({ doseCount: 2 });
    await repo.save(article);
    await repo.save({ ...article, title: 'Nuevo título' });
    expect(await count('articles')).toBe(1);
    expect(await count('doses')).toBe(2);
    expect((await repo.getWithDoses(article.id))?.title).toBe('Nuevo título');
  });

  it('una falla a mitad de guardado no deja datos parciales (transacción)', async () => {
    const repo = new LocalArticleRepository(getDb);
    const article = makeArticle({ doseCount: 2 });
    article.doses[1] = { ...article.doses[1], id: article.doses[0].id }; // id duplicado → falla el INSERT
    await expect(repo.save(article)).rejects.toBeTruthy();
    expect(await count('articles')).toBe(0);
    expect(await count('doses')).toBe(0);
  });

  it('lista del más reciente al más antiguo y filtra por texto y guardados', async () => {
    const repo = new LocalArticleRepository(getDb);
    await repo.save(makeArticle({ title: 'Antiguo sueño', createdAt: '2026-01-01T00:00:00.000Z' }));
    await repo.save(makeArticle({ title: 'Reciente memoria', createdAt: '2026-06-01T00:00:00.000Z' }));
    expect((await repo.list()).map((a) => a.title)).toEqual(['Reciente memoria', 'Antiguo sueño']);
    expect((await repo.list({ query: 'sueño' })).map((a) => a.title)).toEqual(['Antiguo sueño']);
    const [recent] = await repo.list();
    await repo.setBookmarked(recent.id, true);
    expect((await repo.list({ bookmarkedOnly: true })).map((a) => a.id)).toEqual([recent.id]);
  });

  it('la búsqueda trata % y _ como texto literal', async () => {
    const repo = new LocalArticleRepository(getDb);
    await repo.save(makeArticle({ title: 'Ahorro del 50% anual' }));
    await repo.save(makeArticle({ title: 'Otro artículo' }));
    expect(await repo.list({ query: '%' })).toHaveLength(1);
  });

  it('borrar un artículo elimina en cascada sus dosis y quiz', async () => {
    const repo = new LocalArticleRepository(getDb);
    const article = makeArticle({ doseCount: 2 });
    await repo.save(article);
    await repo.remove(article.id);
    expect(await count('articles')).toBe(0);
    expect(await count('doses')).toBe(0);
    expect(await count('quiz_questions')).toBe(0);
    expect(await repo.getWithDoses(article.id)).toBeNull();
  });

  it('la caché expulsa por LRU cuando supera el límite', async () => {
    let t = 1000;
    const repo = new LocalArticleRepository(getDb, { cacheLimit: 2, now: () => t++ });
    const a = makeArticle({ title: 'A' });
    const b = makeArticle({ title: 'B' });
    const c = makeArticle({ title: 'C' });
    await repo.save(a);
    await repo.save(b);
    await repo.getWithDoses(a.id); // A se abre después que B → B es el menos reciente
    await repo.save(c);
    const titles = (await repo.list()).map((x) => x.title).sort();
    expect(titles).toEqual(['A', 'C']);
  });

  it('una fila corrupta se omite de la lista en vez de romperla (validación zod)', async () => {
    const repo = new LocalArticleRepository(getDb);
    await repo.save(makeArticle({ title: 'Válido' }));
    await db.runAsync(
      `INSERT INTO articles (id, title, source_type, summary_points, total_minutes, dose_count, created_at)
       VALUES ('no-es-uuid', 'Corrupto', 'inventado', '[]', 1, 1, 'ayer')`,
    );
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect((await repo.list()).map((a) => a.title)).toEqual(['Válido']);
    warn.mockRestore();
  });
});

describe('LocalProgressRepository', () => {
  it('recordSession es idempotente por id', async () => {
    const repo = new LocalProgressRepository(getDb);
    const s = makeSession();
    await repo.recordSession(s);
    await repo.recordSession(s);
    await repo.recordSession({ ...s });
    expect(await count('reading_sessions')).toBe(1);
  });

  it('rechaza sesiones que violan el contrato', async () => {
    const repo = new LocalProgressRepository(getDb);
    await expect(repo.recordSession(makeSession({ activeSeconds: 99999 }))).rejects.toBeTruthy();
  });

  it('listSessions devuelve solo desde la fecha indicada, ordenadas', async () => {
    const repo = new LocalProgressRepository(getDb);
    const old = makeSession({ endedAt: '2026-08-01T10:00:00.000Z', startedAt: '2026-08-01T09:57:00.000Z' });
    const recent = makeSession({ endedAt: '2026-09-20T10:00:00.000Z', startedAt: '2026-09-20T09:57:00.000Z', quizCorrect: true });
    await repo.recordSession(recent);
    await repo.recordSession(old);
    const list = await repo.listSessions('2026-09-01T00:00:00.000Z');
    expect(list).toEqual([recent]);
    expect(list[0].quizCorrect).toBe(true);
  });

  it('articleProgress cuenta dosis completadas distintas y la última lectura', async () => {
    const repo = new LocalProgressRepository(getDb);
    const articleId = makeArticle().id;
    const [d1, d2] = [makeArticle().id, makeArticle().id];
    await repo.recordSession(makeSession({ articleId, doseId: d1, endedAt: '2026-09-20T10:00:00.000Z', startedAt: '2026-09-20T09:57:00.000Z' }));
    await repo.recordSession(makeSession({ articleId, doseId: d1, endedAt: '2026-09-21T10:00:00.000Z', startedAt: '2026-09-21T09:57:00.000Z' })); // misma dosis releída
    await repo.recordSession(makeSession({ articleId, doseId: d2, completed: false, endedAt: '2026-09-22T10:00:00.000Z', startedAt: '2026-09-22T09:57:00.000Z' }));
    expect(await repo.articleProgress()).toEqual([{ articleId, completedDoses: 1, lastReadAt: '2026-09-22T10:00:00.000Z' }]);
  });
});

describe('Outbox', () => {
  it('encola de forma idempotente y conserva el payload validado', async () => {
    const outbox = new Outbox(getDb);
    const s = makeSession();
    await outbox.enqueue(s);
    await outbox.enqueue(s);
    expect(await outbox.count()).toBe(1);
    expect((await outbox.all())[0].session).toEqual(s);
  });

  it('backoff exponencial con tope de 15 min', () => {
    expect([1, 2, 3, 4].map(backoffDelayMs)).toEqual([2000, 4000, 8000, 16000]);
    expect(backoffDelayMs(30)).toBe(15 * 60_000);
  });

  it('markFailed aplaza el siguiente intento; remove solo borra cuando se pide', async () => {
    let now = 10_000;
    const outbox = new Outbox(getDb, () => now);
    const s = makeSession();
    await outbox.enqueue(s);
    expect(await outbox.due()).toHaveLength(1);
    await outbox.markFailed(s.id);
    expect(await outbox.due()).toHaveLength(0);
    expect((await outbox.all())[0]).toMatchObject({ attempts: 1, nextAttemptAt: 12_000 });
    now = 12_000;
    expect(await outbox.due()).toHaveLength(1);
    await outbox.remove(s.id);
    expect(await outbox.count()).toBe(0);
  });

  it('descarta entradas con payload inválido', async () => {
    const outbox = new Outbox(getDb);
    await db.runAsync("INSERT INTO reading_sessions_outbox (id, payload, created_at) VALUES ('x', '{roto', 1)");
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect(await outbox.all()).toEqual([]);
    expect(await outbox.count()).toBe(0);
    warn.mockRestore();
  });
});

describe('LocalSettingsRepository (SQLite)', () => {
  it('devuelve los valores por defecto si no hay nada guardado', async () => {
    expect(await new LocalSettingsRepository(getDb).get()).toEqual(DEFAULT_SETTINGS);
  });

  it('persiste cambios parciales y registra updated_at', async () => {
    const now = new Date('2026-09-30T12:00:00.000Z');
    const repo = new LocalSettingsRepository(getDb, () => now);
    await repo.update({ theme: 'sepia', readerFontScale: 1.4 });
    const loaded = await new LocalSettingsRepository(getDb).get();
    expect(loaded).toMatchObject({ theme: 'sepia', readerFontScale: 1.4, speechRate: DEFAULT_SETTINGS.speechRate });
    expect(await repo.getUpdatedAt()).toBe(now.toISOString());
    expect(await count('settings')).toBe(1);
  });

  it('rechaza valores fuera de contrato y no los guarda', async () => {
    const repo = new LocalSettingsRepository(getDb);
    await expect(repo.update({ readerFontScale: 9 })).rejects.toBeTruthy();
    expect((await repo.get()).readerFontScale).toBe(DEFAULT_SETTINGS.readerFontScale);
  });

  it('datos corruptos vuelven a los valores por defecto', async () => {
    await db.runAsync(`INSERT INTO settings (id, data, updated_at) VALUES (1, '{"theme":"neon"}', 'x')`);
    expect(await new LocalSettingsRepository(getDb).get()).toEqual(DEFAULT_SETTINGS);
  });
});
