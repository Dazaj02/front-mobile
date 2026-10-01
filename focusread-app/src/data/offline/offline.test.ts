import { DEFAULT_SETTINGS } from '../../domain/defaults';
import { AppError } from '../../lib/errors';
import { computeStats, mergeSessions } from '../../domain/stats';
import { SyncService } from '../../services/sync/SyncService';
import { FakeRemote } from '../../test/fakeRemote';
import { makeArticle, makeSession } from '../../test/fixtures';
import { createTestDb, type TestDb } from '../../test/testDb';
import { LocalArticleRepository } from '../local/LocalArticleRepository';
import { LocalProgressRepository } from '../local/LocalProgressRepository';
import { Outbox } from '../local/outbox';
import { LocalSettingsRepository } from '../local/settingsCache';
import { CachedArticleRepository } from './CachedArticleRepository';
import { composeOffline } from './composeOffline';
import { SyncedSettingsRepository } from './SyncedSettingsRepository';

let db: TestDb;
let remote: FakeRemote;
let online: boolean;
const getDb = async () => db;
const isOnline = () => online;
const count = async (table: string) => (await db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM ${table}`))?.n;

beforeEach(async () => {
  db = await createTestDb();
  remote = new FakeRemote();
  online = true;
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

describe('outbox + sincronización de sesiones', () => {
  it('3 sesiones sin conexión → al reconectar hay 3 filas remotas y 0 en la outbox; reenviarlas sigue dejando 3', async () => {
    const { outbox, sync } = composeOffline(getDb, remote.adapters(), isOnline);
    online = false;
    remote.online = false;
    const sessions = [makeSession(), makeSession(), makeSession()];
    for (const s of sessions) await outbox.enqueue(s); // lo que hace el lector sin red

    expect(await sync.flush()).toMatchObject({ sent: 0, skipped: true, remaining: 3 });
    expect(remote.sessions.size).toBe(0);

    online = true;
    remote.online = true;
    expect(await sync.flush()).toEqual({ sent: 3, failed: 0, dropped: 0, remaining: 0, skipped: false });
    expect(remote.sessions.size).toBe(3);
    expect(await outbox.count()).toBe(0);

    // Reenvío de las mismas sesiones (p. ej. el cliente no recibió la confirmación): idempotente
    for (const s of sessions) await outbox.enqueue(s);
    await sync.flush();
    expect(remote.sessions.size).toBe(3);
    expect(remote.calls.duplicateSessions).toBe(3);
    expect(await outbox.count()).toBe(0);
  });

  it('una entrada solo sale de la outbox si el servidor respondió OK', async () => {
    const { outbox, sync } = composeOffline(getDb, remote.adapters(), isOnline);
    const [a, b] = [makeSession(), makeSession()];
    await outbox.enqueue(a);
    await outbox.enqueue(b);
    remote.failNext = 1; // falla la primera llamada, la segunda funciona
    const result = await sync.flush();
    expect(result).toMatchObject({ sent: 1, failed: 1, remaining: 1 });
    expect(remote.sessions.size).toBe(1);
    expect((await outbox.all()).map((e) => e.session.id)).toHaveLength(1);
  });

  it('reintenta con backoff exponencial: no reenvía antes de tiempo y luego sí', async () => {
    let t = 1_000_000;
    const outbox = new Outbox(getDb, () => t);
    const progress = new LocalProgressRepository(getDb);
    const sync = new SyncService({ outbox, remote: remote.progressRepo, isOnline, now: () => t });
    void progress;
    const s = makeSession();
    await outbox.enqueue(s);

    remote.failNext = 2;
    await sync.flush(); // intento 1 falla → espera 2 s
    expect((await outbox.all())[0]).toMatchObject({ attempts: 1, nextAttemptAt: t + 2000 });
    expect(await sync.nextRetryDelayMs()).toBe(2000);

    expect(await sync.flush()).toMatchObject({ sent: 0, failed: 0 }); // todavía no toca
    expect(remote.calls.recordSession).toBe(0);

    t += 2000;
    await sync.flush(); // intento 2 falla → espera 4 s
    expect((await outbox.all())[0]).toMatchObject({ attempts: 2, nextAttemptAt: t + 4000 });

    t += 4000;
    expect(await sync.flush()).toMatchObject({ sent: 1, remaining: 0 });
    expect(await sync.nextRetryDelayMs()).toBeNull();
  });

  it('ignoreBackoff (cerrar sesión) envía todo de inmediato', async () => {
    const { outbox, sync } = composeOffline(getDb, remote.adapters(), isOnline);
    await outbox.enqueue(makeSession());
    remote.failNext = 1;
    await sync.flush(); // falla y queda con espera
    expect(await sync.flush()).toMatchObject({ sent: 0 }); // en espera
    expect(await sync.flush({ ignoreBackoff: true })).toMatchObject({ sent: 1, remaining: 0 });
  });

  it('una sesión rechazada de forma permanente (restricción/RLS) se descarta y no bloquea la cola', async () => {
    const { outbox, sync } = composeOffline(getDb, remote.adapters(), isOnline);
    const [bad, good] = [makeSession(), makeSession()];
    await outbox.enqueue(bad);
    await outbox.enqueue(good);
    const original = remote.progressRepo.recordSession;
    jest.spyOn(remote.progressRepo, 'recordSession').mockImplementation(async (s) => {
      if (s.id === bad.id) throw new AppError('VALIDATION_ERROR', 'check violation');
      return original(s);
    });
    const result = await sync.flush();
    expect(result).toMatchObject({ sent: 1, dropped: 1, failed: 0, remaining: 0 });
    expect(remote.sessions.has(good.id)).toBe(true);
    expect(remote.sessions.has(bad.id)).toBe(false);
  });

  it('sin sesión válida (401) se detiene y conserva todo lo pendiente', async () => {
    const { outbox, sync } = composeOffline(getDb, remote.adapters(), isOnline);
    for (let i = 0; i < 3; i++) await outbox.enqueue(makeSession());
    const spy = jest.spyOn(remote.progressRepo, 'recordSession').mockRejectedValue(new AppError('UNAUTHORIZED', 'x'));
    const result = await sync.flush();
    expect(result).toMatchObject({ sent: 0, failed: 1, remaining: 3 });
    expect(spy).toHaveBeenCalledTimes(1); // no insiste con las demás
  });

  it('nunca hay dos flush simultáneos', async () => {
    const { outbox, sync } = composeOffline(getDb, remote.adapters(), isOnline);
    for (let i = 0; i < 3; i++) await outbox.enqueue(makeSession());
    const [r1, r2] = await Promise.all([sync.flush(), sync.flush()]);
    expect(r1).toBe(r2);
    expect(remote.calls.recordSession).toBe(3); // no 6
  });

  it('avisa a los oyentes solo cuando se envió algo', async () => {
    const { outbox, sync } = composeOffline(getDb, remote.adapters(), isOnline);
    const cb = jest.fn();
    sync.onFlushed(cb);
    await sync.flush();
    expect(cb).not.toHaveBeenCalled();
    await outbox.enqueue(makeSession());
    await sync.flush();
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ sent: 1 }));
  });

  it('lo enviado queda también en la caché local de sesiones (se ve sin conexión)', async () => {
    const { outbox, sync } = composeOffline(getDb, remote.adapters(), isOnline);
    await outbox.enqueue(makeSession());
    await sync.flush();
    expect(await count('reading_sessions')).toBe(1);
  });

  it('las estadísticas cuentan las sesiones pendientes de la outbox sin duplicar las ya enviadas', async () => {
    const { progress, outbox, sync } = composeOffline(getDb, remote.adapters(), isOnline);
    const sent = makeSession({ activeSeconds: 600 });
    const pending = makeSession({ activeSeconds: 300 });
    await outbox.enqueue(sent);
    await sync.flush();
    online = false;
    remote.online = false;
    await outbox.enqueue(pending);

    const cached = await progress.listSessions('2000-01-01T00:00:00.000Z'); // sin red: de la caché
    const all = mergeSessions(cached, (await outbox.all()).map((e) => e.session));
    expect(all).toHaveLength(2);
    expect(computeStats(all, new Date('2026-09-30T18:00:00.000Z')).totalMinutes).toBe(15);
  });
});

describe('artículos: caché para leer sin conexión', () => {
  it('un artículo abierto con conexión se puede leer sin conexión (con dosis y quiz)', async () => {
    const { articles } = composeOffline(getDb, remote.adapters(), isOnline);
    const article = makeArticle({ doseCount: 3 });
    remote.articles.set(article.id, article);

    expect(await articles.getWithDoses(article.id)).toEqual(article); // online → remoto + guarda caché
    online = false;
    remote.online = false;
    const offline = await articles.getWithDoses(article.id);
    expect(offline).toEqual(article);
    expect(offline?.doses[2].quiz).not.toBeNull();
    expect(remote.calls.getArticle).toBe(1); // no volvió a pedirlo
  });

  it('un artículo nunca abierto no está disponible sin conexión', async () => {
    const { articles } = composeOffline(getDb, remote.adapters(), isOnline);
    const article = makeArticle();
    remote.articles.set(article.id, article);
    online = false;
    await expect(articles.getWithDoses(article.id)).rejects.toMatchObject({ code: 'NOT_AVAILABLE_OFFLINE' });
  });

  it('la lista sin conexión muestra solo lo guardado en caché', async () => {
    const { articles } = composeOffline(getDb, remote.adapters(), isOnline);
    const [opened, unopened] = [makeArticle({ title: 'Abierto' }), makeArticle({ title: 'Sin abrir' })];
    remote.articles.set(opened.id, opened);
    remote.articles.set(unopened.id, unopened);
    expect((await articles.list()).map((a) => a.title).sort()).toEqual(['Abierto', 'Sin abrir']);
    await articles.getWithDoses(opened.id);
    online = false;
    expect((await articles.list()).map((a) => a.title)).toEqual(['Abierto']);
  });

  it('si el remoto no responde estando "con conexión" cae a la caché; otros errores se propagan', async () => {
    const { articles } = composeOffline(getDb, remote.adapters(), isOnline);
    const article = makeArticle();
    remote.articles.set(article.id, article);
    await articles.getWithDoses(article.id);

    remote.online = false; // el sistema cree que hay red pero el servidor no contesta
    expect(await articles.getWithDoses(article.id)).toEqual(article);
    expect((await articles.list()).map((a) => a.id)).toEqual([article.id]);

    remote.online = true;
    jest.spyOn(remote.articleRepo, 'getWithDoses').mockRejectedValueOnce(Object.assign(new Error('x'), { code: 'INTERNAL' }));
    await expect(articles.getWithDoses(article.id)).rejects.toBeTruthy();
  });

  it('la caché guarda como máximo 50 artículos y expulsa los menos recientes (LRU)', async () => {
    let t = 1;
    const cache = new LocalArticleRepository(getDb, { cacheLimit: 50, now: () => t++ });
    const repo = new CachedArticleRepository(remote.articleRepo, cache, isOnline);
    const ids: string[] = [];
    for (let i = 0; i < 52; i++) {
      const a = makeArticle({ title: `A${i}` });
      remote.articles.set(a.id, a);
      ids.push(a.id);
      await repo.getWithDoses(a.id);
    }
    expect(await count('articles')).toBe(50);
    online = false;
    await expect(repo.getWithDoses(ids[0])).rejects.toMatchObject({ code: 'NOT_AVAILABLE_OFFLINE' }); // los 2 más antiguos salieron
    await expect(repo.getWithDoses(ids[1])).rejects.toMatchObject({ code: 'NOT_AVAILABLE_OFFLINE' });
    expect((await repo.getWithDoses(ids[51]))?.title).toBe('A51');
    expect(await count('doses')).toBe(50 * 2); // las dosis de lo expulsado también se fueron
  });

  it('abrir un artículo lo hace "reciente" y lo protege de la expulsión', async () => {
    let t = 1;
    const cache = new LocalArticleRepository(getDb, { cacheLimit: 3, now: () => t++ });
    const repo = new CachedArticleRepository(remote.articleRepo, cache, isOnline);
    const arts = [0, 1, 2].map((i) => makeArticle({ title: `A${i}` }));
    for (const a of arts) {
      remote.articles.set(a.id, a);
      await repo.getWithDoses(a.id);
    }
    await repo.getWithDoses(arts[0].id); // A0 vuelve a ser el más reciente
    const extra = makeArticle({ title: 'A3' });
    remote.articles.set(extra.id, extra);
    await repo.getWithDoses(extra.id); // expulsa A1 (el menos reciente)
    online = false;
    expect((await repo.list()).map((a) => a.title).sort()).toEqual(['A0', 'A2', 'A3']);
  });

  it('favorito y borrar requieren conexión y no tocan nada sin ella', async () => {
    const { articles } = composeOffline(getDb, remote.adapters(), isOnline);
    const article = makeArticle();
    remote.articles.set(article.id, article);
    await articles.getWithDoses(article.id);

    online = false;
    await expect(articles.setBookmarked(article.id, true)).rejects.toMatchObject({ code: 'NOT_AVAILABLE_OFFLINE' });
    await expect(articles.remove(article.id)).rejects.toMatchObject({ code: 'NOT_AVAILABLE_OFFLINE' });
    expect(remote.calls.setBookmarked + remote.calls.remove).toBe(0);
    expect((await articles.getWithDoses(article.id))?.bookmarked).toBe(false);

    online = true;
    await articles.setBookmarked(article.id, true);
    expect(remote.articles.get(article.id)?.bookmarked).toBe(true);
    expect((await articles.list({ bookmarkedOnly: true })).map((a) => a.id)).toEqual([article.id]);
    await articles.remove(article.id);
    expect(remote.articles.has(article.id)).toBe(false);
    expect(await count('articles')).toBe(0);
  });
});

describe('ajustes: local al instante y última escritura gana', () => {
  const setup = () => {
    const local = new LocalSettingsRepository(getDb, () => new Date(clock));
    const repo = new SyncedSettingsRepository(local, remote.settingsRemote, isOnline);
    return { local, repo };
  };
  let clock = Date.parse('2026-09-30T12:00:00.000Z');
  beforeEach(() => {
    clock = Date.parse('2026-09-30T12:00:00.000Z');
  });
  const flushMicrotasks = () => new Promise<void>((r) => setTimeout(r, 0));

  it('se guardan al instante sin conexión y se suben al reconectar', async () => {
    const { repo, local } = setup();
    online = false;
    await repo.update({ theme: 'dark', readerFontScale: 1.3 });
    expect(await repo.get()).toMatchObject({ theme: 'dark', readerFontScale: 1.3 });
    expect(await local.isDirty()).toBe(true);
    expect(remote.settings).toBeNull();

    online = true;
    expect(await repo.sync()).toEqual({ direction: 'pushed' });
    expect(remote.settings?.settings).toMatchObject({ theme: 'dark', readerFontScale: 1.3 });
    expect(await local.isDirty()).toBe(false);
  });

  it('con conexión, cada cambio se sube en segundo plano', async () => {
    const { repo } = setup();
    await repo.update({ theme: 'sepia' });
    await flushMicrotasks();
    expect(remote.settings?.settings.theme).toBe('sepia');
  });

  it('si el remoto es más reciente se baja y reemplaza lo local', async () => {
    const { repo, local } = setup();
    await repo.update({ theme: 'sepia' });
    await flushMicrotasks();
    remote.settings = { settings: { ...DEFAULT_SETTINGS, theme: 'dark', speechRate: 1.5 }, updatedAt: '2026-09-30T13:00:00.000Z' };
    expect(await repo.sync()).toEqual({ direction: 'pulled' });
    expect(await repo.get()).toMatchObject({ theme: 'dark', speechRate: 1.5 });
    expect(await local.getUpdatedAt()).toBe('2026-09-30T13:00:00.000Z');
  });

  it('si lo local es más reciente (aunque el remoto tenga otro valor) se sube', async () => {
    const { repo } = setup();
    remote.settings = { settings: { ...DEFAULT_SETTINGS, theme: 'dark' }, updatedAt: '2026-09-30T11:00:00.000Z' };
    online = false;
    await repo.update({ theme: 'sepia' }); // a las 12:00, más nuevo que el remoto de las 11:00
    online = true;
    expect(await repo.sync()).toEqual({ direction: 'pushed' });
    expect(remote.settings?.settings.theme).toBe('sepia');
  });

  it('conflicto: gana la última escritura entre dos dispositivos', async () => {
    const { repo } = setup();
    online = false;
    await repo.update({ theme: 'sepia' }); // este dispositivo, 12:00
    remote.settings = { settings: { ...DEFAULT_SETTINGS, theme: 'dark' }, updatedAt: '2026-09-30T12:00:05.000Z' }; // otro dispositivo, 12:00:05
    online = true;
    expect((await repo.sync()).direction).toBe('pulled');
    expect((await repo.get()).theme).toBe('dark');
  });

  it('sin remoto guardado sube lo local; sin nada local no hace nada; sin conexión avisa', async () => {
    const { repo } = setup();
    expect(await repo.sync()).toEqual({ direction: 'none' });
    online = false;
    expect(await repo.sync()).toEqual({ direction: 'offline' });
    online = true;
    await repo.update({ theme: 'sepia' });
    await flushMicrotasks();
    remote.settings = null;
    expect(await repo.sync()).toEqual({ direction: 'pushed' });
  });

  it('un reloj del teléfono atrasado NO hace perder ediciones propias (el servidor fija su propia fecha)', async () => {
    remote.serverSkewMs = 10 * 60_000; // el servidor va 10 min adelantado
    const { repo, local } = setup();
    await repo.update({ theme: 'sepia' });
    await flushMicrotasks();
    expect(remote.settings?.settings.theme).toBe('sepia');

    clock += 60_000; // un minuto después el usuario vuelve a cambiar algo (su fecha sigue "antes" que la del servidor)
    online = false;
    await repo.update({ theme: 'dark' });
    online = true;
    expect(await repo.sync()).toEqual({ direction: 'pushed' }); // no se baja lo viejo
    expect(remote.settings?.settings.theme).toBe('dark');
    expect((await repo.get()).theme).toBe('dark');
    expect(await local.isDirty()).toBe(false);
  });

  it('si OTRO dispositivo escribió después, sus cambios ganan sobre los locales pendientes', async () => {
    const { repo } = setup();
    await repo.update({ theme: 'sepia' });
    await flushMicrotasks(); // baseline = 12:00
    clock += 1_000;
    online = false;
    await repo.update({ speechRate: 1.5 }); // edición local pendiente a las 12:00:01
    remote.settings = { settings: { ...DEFAULT_SETTINGS, theme: 'dark' }, updatedAt: '2026-09-30T12:05:00.000Z' }; // otro dispositivo, más tarde
    online = true;
    expect((await repo.sync()).direction).toBe('pulled');
    expect(await repo.get()).toMatchObject({ theme: 'dark', speechRate: 1 });
  });

  it('si OTRO dispositivo escribió ANTES de la edición local pendiente, gana la local', async () => {
    const { repo } = setup();
    await repo.update({ theme: 'sepia' });
    await flushMicrotasks();
    remote.settings = { settings: { ...DEFAULT_SETTINGS, theme: 'dark' }, updatedAt: '2026-09-30T12:00:30.000Z' };
    clock += 60_000;
    online = false;
    await repo.update({ speechRate: 1.5 }); // 12:01:00, posterior a lo del otro dispositivo
    online = true;
    expect((await repo.sync()).direction).toBe('pushed');
    expect(remote.settings?.settings.speechRate).toBe(1.5);
  });

  it('compara fechas reales aunque el servidor use otro formato (+00:00)', async () => {
    const { repo } = setup();
    online = false;
    await repo.update({ theme: 'sepia' }); // 2026-09-30T12:00:00.000Z
    remote.settings = { settings: { ...DEFAULT_SETTINGS, theme: 'dark' }, updatedAt: '2026-09-30T11:59:59+00:00' }; // un segundo antes
    online = true;
    expect((await repo.sync()).direction).toBe('pushed');
  });

  it('un fallo de red al subir no rompe el guardado local y queda pendiente', async () => {
    const { repo, local } = setup();
    remote.failNext = 5;
    await expect(repo.update({ theme: 'dark' })).resolves.toMatchObject({ theme: 'dark' });
    await flushMicrotasks();
    expect(await local.isDirty()).toBe(true);
  });
});
