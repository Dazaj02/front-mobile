import { randomUUID } from 'crypto';

import { AppError } from '../../lib/errors';
import { makeSession } from '../../test/fixtures';
import {
  articleRowToArticle,
  articleRowToArticleWithDoses,
  normalizeQuizRelation,
  progressRowToProgress,
  sessionRowToSession,
  sessionToRow,
  settingsRowToSettings,
  settingsToRow,
} from './mappers';
import { SupabaseArticleRepository } from './SupabaseArticleRepository';
import { SupabaseAuthRepository, extractAuthCode } from './SupabaseAuthRepository';
import { SupabaseProgressRepository } from './SupabaseProgressRepository';
import { SupabaseSettingsRemote } from './SupabaseSettingsRemote';
import { toAppError, toAuthError } from './supabaseErrors';

// ---------- Cliente Supabase simulado: registra la cadena de llamadas y devuelve un resultado fijo ----------
type Call = [string, ...unknown[]];
function chain(result: { data?: unknown; error?: unknown }, calls: Call[]) {
  const q: Record<string, unknown> = new Proxy(
    {},
    {
      get: (_t, prop: string) => {
        if (prop === 'then') return (res: (v: unknown) => void, rej: (e: unknown) => void) => Promise.resolve({ data: null, error: null, ...result }).then(res, rej);
        return (...args: unknown[]) => {
          calls.push([prop, ...args]);
          return q;
        };
      },
    },
  );
  return q;
}
function fakeClient(result: { data?: unknown; error?: unknown }, extra: Record<string, unknown> = {}) {
  const calls: Call[] = [];
  const client = {
    from: jest.fn((table: string) => {
      calls.push(['from', table]);
      return chain(result, calls);
    }),
    auth: { getUser: jest.fn(async () => ({ data: { user: { id: 'user-1' } } })) },
    ...extra,
  };
  return { client: client as never, calls, names: () => calls.map((c) => c[0]) };
}

const articleRow = (o: Record<string, unknown> = {}) => ({
  id: randomUUID(),
  title: 'Un artículo',
  category: null,
  source_type: 'text',
  source_url: null,
  summary_points: ['a', 'b'],
  total_minutes: '7.5', // numeric llega a veces como texto
  dose_count: 2,
  bookmarked: false,
  ai_provider: 'deepseek',
  ai_model: 'deepseek-flash',
  created_at: '2026-09-30T12:00:00+00:00',
  ...o,
});

describe('mappers (snake_case → camelCase, validados con zod)', () => {
  it('artículo: convierte nombres, acepta numeric como texto y offsets +00:00', () => {
    const a = articleRowToArticle(articleRow());
    expect(a).toMatchObject({ sourceType: 'text', totalMinutes: 7.5, doseCount: 2, aiProvider: 'deepseek', aiModel: 'deepseek-flash', bookmarked: false });
    expect(a.createdAt).toBe('2026-09-30T12:00:00+00:00');
  });

  it('una fila inválida (source_type desconocido, id que no es uuid) lanza en vez de llegar a la UI', () => {
    expect(() => articleRowToArticle(articleRow({ source_type: 'inventado' }))).toThrow();
    expect(() => articleRowToArticle(articleRow({ id: 'no-uuid' }))).toThrow();
    expect(() => articleRowToArticle(articleRow({ dose_count: 25 }))).toThrow();
  });

  it('quiz_questions tolera objeto, arreglo de 0..1 elementos y null', () => {
    const quiz = { id: randomUUID(), question: '¿?', options: ['a', 'b'], correct_index: 1, explanation: null };
    expect(normalizeQuizRelation(quiz)).toBe(quiz);
    expect(normalizeQuizRelation([quiz])).toBe(quiz);
    expect(normalizeQuizRelation([])).toBeNull();
    expect(normalizeQuizRelation(null)).toBeNull();
    expect(normalizeQuizRelation(undefined)).toBeNull();
  });

  it('artículo con dosis: ordena por posición y mapea el quiz en cualquiera de las tres formas', () => {
    const id = randomUUID();
    const dose = (position: number, quiz: unknown) => ({ id: randomUUID(), article_id: id, position, title: null, content: `D${position}`, est_minutes: '2.5', quiz_questions: quiz });
    const quiz = { id: randomUUID(), question: '¿?', options: ['a', 'b', 'c'], correct_index: 2, explanation: 'porque' };
    const full = articleRowToArticleWithDoses({ ...articleRow({ id }), doses: [dose(2, null), dose(0, quiz), dose(1, [quiz])] });
    expect(full.doses.map((d) => d.position)).toEqual([0, 1, 2]);
    expect(full.doses[0].quiz).toMatchObject({ correctIndex: 2, explanation: 'porque' });
    expect(full.doses[1].quiz?.question).toBe('¿?');
    expect(full.doses[2].quiz).toBeNull();
    expect(full.doses[0].estMinutes).toBe(2.5);
  });

  it('un quiz con índice fuera de rango invalida todo el artículo', () => {
    const id = randomUUID();
    const bad = { id: randomUUID(), question: '¿?', options: ['a', 'b'], correct_index: 5, explanation: null };
    expect(() =>
      articleRowToArticleWithDoses({ ...articleRow({ id, dose_count: 1 }), doses: [{ id: randomUUID(), article_id: id, position: 0, content: 'x', est_minutes: 1, quiz_questions: bad }] }),
    ).toThrow();
  });

  it('sesión: ida y vuelta y NUNCA se envía user_id', () => {
    const s = makeSession({ articleId: randomUUID(), doseId: randomUUID(), quizCorrect: true });
    const row = sessionToRow(s);
    expect(Object.keys(row).sort()).toEqual(['active_seconds', 'article_id', 'completed', 'dose_id', 'ended_at', 'id', 'quiz_correct', 'started_at']);
    expect(row).not.toHaveProperty('user_id');
    expect(sessionRowToSession(row)).toEqual(s);
  });

  it('progreso y ajustes', () => {
    expect(progressRowToProgress({ article_id: 'a', completed_doses: '3', last_read_at: null })).toEqual({ articleId: 'a', completedDoses: 3, lastReadAt: null });
    const { settings, updatedAt } = settingsRowToSettings({
      theme: 'sepia', reader_font_scale: '1.30', target_dose_minutes: '3.5', voice_id: 'cloud:x', speech_rate: 1.5, speech_pitch: '0.80',
      haptics_enabled: false, quiz_enabled: true, ai_provider: 'openai', ai_model: null, updated_at: '2026-09-30T12:00:00+00:00',
    });
    expect(settings).toMatchObject({ theme: 'sepia', readerFontScale: 1.3, targetDoseMinutes: 3.5, speechPitch: 0.8, hapticsEnabled: false, voiceId: 'cloud:x', aiProvider: 'openai', aiModel: null });
    expect(updatedAt).toBe('2026-09-30T12:00:00+00:00');
    const row = settingsToRow(settings);
    expect(row).not.toHaveProperty('updated_at'); // lo pone el trigger
    expect(row).not.toHaveProperty('user_id');
    expect(row).toMatchObject({ reader_font_scale: 1.3, target_dose_minutes: 3.5, voice_id: 'cloud:x' });
  });
});

describe('traducción de errores', () => {
  it.each([
    [{ name: 'TypeError', message: 'Network request failed' }, 'NETWORK_ERROR'],
    [{ status: 401, message: 'x' }, 'UNAUTHORIZED'],
    [{ code: 'PGRST301', message: 'JWT expired' }, 'UNAUTHORIZED'],
    [{ code: '23514', message: 'check violation' }, 'VALIDATION_ERROR'],
    [{ code: '23503', message: 'fk' }, 'VALIDATION_ERROR'],
    [{ code: '42501', message: 'RLS' }, 'VALIDATION_ERROR'],
    [{ code: 'PGRST116', message: 'no rows' }, 'NOT_FOUND'],
    [{ status: 429, message: 'slow' }, 'RATE_LIMITED'],
    [{ status: 500, message: 'boom' }, 'INTERNAL'],
  ])('PostgREST %j → %s', (input, code) => {
    expect(toAppError(input)).toMatchObject({ code });
  });

  it.each([
    [{ code: 'invalid_credentials', message: 'Invalid login credentials' }, 'INVALID_CREDENTIALS'],
    [{ message: 'Email not confirmed' }, 'EMAIL_NOT_CONFIRMED'],
    [{ code: 'over_email_send_rate_limit' }, 'RATE_LIMITED'],
    [{ code: 'weak_password', message: 'Password should be…' }, 'VALIDATION_ERROR'],
    [{ name: 'TypeError', message: 'Network request failed' }, 'NETWORK_ERROR'],
  ])('Auth %j → %s', (input, code) => {
    expect(toAuthError(input)).toMatchObject({ code });
  });

  it('un AppError existente pasa sin cambios', () => {
    const e = new AppError('QUOTA_EXCEEDED', 'x');
    expect(toAppError(e)).toBe(e);
  });
});

describe('SupabaseArticleRepository', () => {
  it('list: ordena del más reciente, filtra favoritos/búsqueda y omite filas corruptas', async () => {
    const good = articleRow({ title: 'Bueno' });
    const { client, calls, names } = fakeClient({ data: [good, articleRow({ source_type: 'roto' })] });
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    const list = await new SupabaseArticleRepository(client).list({ bookmarkedOnly: true, query: '50%' });
    expect(list.map((a) => a.title)).toEqual(['Bueno']);
    expect(names()).toEqual(expect.arrayContaining(['from', 'select', 'order', 'eq', 'ilike']));
    expect(calls.find((c) => c[0] === 'order')).toEqual(['order', 'created_at', { ascending: false }]);
    expect(calls.find((c) => c[0] === 'eq')).toEqual(['eq', 'bookmarked', true]);
    expect(calls.find((c) => c[0] === 'ilike')?.[2]).toBe('%50\\%%'); // % del usuario como texto literal
  });

  it('getWithDoses: pide artículo → dosis → quiz en una consulta y devuelve null si no existe', async () => {
    const id = randomUUID();
    const { client, calls } = fakeClient({ data: { ...articleRow({ id, dose_count: 1 }), doses: [{ id: randomUUID(), article_id: id, position: 0, content: 'Hola', est_minutes: 1, title: null, quiz_questions: [] }] } });
    const repo = new SupabaseArticleRepository(client);
    const article = await repo.getWithDoses(id);
    expect(article?.doses).toHaveLength(1);
    const select = calls.find((c) => c[0] === 'select')?.[1] as string;
    expect(select).toContain('doses(');
    expect(select).toContain('quiz_questions(');
    expect(calls.map((c) => c[0])).toContain('maybeSingle');

    expect(await new SupabaseArticleRepository(fakeClient({ data: null }).client).getWithDoses(id)).toBeNull();
  });

  it('favorito y borrar usan update/delete sobre el id (la app nunca inserta)', async () => {
    const { client, calls } = fakeClient({});
    const repo = new SupabaseArticleRepository(client);
    await repo.setBookmarked('a1', true);
    await repo.remove('a1');
    expect(calls).toEqual(expect.arrayContaining([['update', { bookmarked: true }], ['eq', 'id', 'a1'], ['delete']]));
    expect(calls.map((c) => c[0])).not.toContain('insert');
  });

  it('errores de la base → AppError tipado', async () => {
    const repo = new SupabaseArticleRepository(fakeClient({ error: { code: 'PGRST301', message: 'JWT expired' } }).client);
    await expect(repo.list()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    await expect(repo.remove('x')).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });
});

describe('SupabaseProgressRepository', () => {
  it('recordSession hace upsert con onConflict id + ignoreDuplicates y sin user_id', async () => {
    const { client, calls } = fakeClient({});
    const s = makeSession();
    await new SupabaseProgressRepository(client).recordSession(s);
    const upsert = calls.find((c) => c[0] === 'upsert') as Call;
    expect(upsert[1]).toEqual(sessionToRow(s));
    expect(upsert[1]).not.toHaveProperty('user_id');
    expect(upsert[2]).toEqual({ onConflict: 'id', ignoreDuplicates: true });
  });

  it('una restricción de la base (check/RLS) se reporta como VALIDATION_ERROR', async () => {
    const repo = new SupabaseProgressRepository(fakeClient({ error: { code: '23514', message: 'check' } }).client);
    await expect(repo.recordSession(makeSession())).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('listSessions filtra por fecha y omite filas inválidas; articleProgress lee la vista', async () => {
    const valid = sessionToRow(makeSession());
    const { client, calls } = fakeClient({ data: [valid, { ...valid, id: 'no-uuid' }] });
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    const repo = new SupabaseProgressRepository(client);
    expect(await repo.listSessions('2026-09-01T00:00:00.000Z')).toHaveLength(1);
    expect(calls.find((c) => c[0] === 'gte')).toEqual(['gte', 'ended_at', '2026-09-01T00:00:00.000Z']);

    const progress = fakeClient({ data: [{ article_id: 'a', completed_doses: 2, last_read_at: '2026-09-30T00:00:00+00:00' }] });
    expect(await new SupabaseProgressRepository(progress.client).articleProgress()).toEqual([{ articleId: 'a', completedDoses: 2, lastReadAt: '2026-09-30T00:00:00+00:00' }]);
    expect(progress.calls[0]).toEqual(['from', 'article_progress']);
  });
});

describe('SupabaseSettingsRemote', () => {
  const row = { theme: 'dark', reader_font_scale: 1.2, target_dose_minutes: 2.5, voice_id: null, speech_rate: 1, speech_pitch: 1, haptics_enabled: true, quiz_enabled: true, ai_provider: 'focusread', ai_model: null, updated_at: '2026-09-30T12:00:00+00:00' };

  it('get mapea la fila; devuelve null si aún no existe', async () => {
    const remote = new SupabaseSettingsRemote(fakeClient({ data: row }).client);
    expect((await remote.get())?.settings.theme).toBe('dark');
    expect(await new SupabaseSettingsRemote(fakeClient({ data: null }).client).get()).toBeNull();
  });

  it('put solo actualiza columnas de ajustes (sin insert, user_id ni updated_at) y devuelve la fecha del servidor', async () => {
    const { client, calls } = fakeClient({ data: { updated_at: '2026-09-30T12:00:05+00:00' } });
    const settings = settingsRowToSettings(row).settings;
    const serverAt = await new SupabaseSettingsRemote(client).put(settings);
    expect(serverAt).toBe('2026-09-30T12:00:05+00:00');
    const update = calls.find((c) => c[0] === 'update') as Call;
    expect(update[1]).not.toHaveProperty('updated_at');
    expect(update[1]).not.toHaveProperty('user_id');
    expect(calls.map((c) => c[0])).not.toContain('insert');
    expect(calls).toEqual(expect.arrayContaining([['eq', 'user_id', 'user-1']]));
  });
});

// ---------- Autenticación ----------
function fakeAuth() {
  let listener: ((event: string, session: unknown) => void) | undefined;
  const session = { user: { id: 'u1', email: 'ana@correo.com' } };
  const auth = {
    getSession: jest.fn(async () => ({ data: { session }, error: null })),
    onAuthStateChange: jest.fn((cb: typeof listener) => {
      listener = cb;
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    }),
    signUp: jest.fn(async () => ({ data: { session: null }, error: null })),
    resend: jest.fn(async () => ({ error: null })),
    signInWithPassword: jest.fn(async () => ({ data: { session }, error: null })),
    signOut: jest.fn(async () => ({ error: null })),
    resetPasswordForEmail: jest.fn(async () => ({ error: null })),
    updateUser: jest.fn(async () => ({ error: null })),
    exchangeCodeForSession: jest.fn(async () => ({ error: null })),
  };
  const deleteAccount = jest.fn(async () => {});
  const repo = new SupabaseAuthRepository({ auth } as never, { deleteAccount, redirectTo: (p) => `focusread://${p}` });
  return { auth, repo, deleteAccount, emit: (event: string, s: unknown = session) => listener?.(event, s), session };
}

describe('SupabaseAuthRepository', () => {
  it('registro: redirige a focusread://auth/callback y pide verificar el correo si no hay sesión', async () => {
    const { auth, repo } = fakeAuth();
    expect(await repo.signUp(' ana@correo.com ', 'Clave1234')).toEqual({ needsEmailVerification: true });
    expect(auth.signUp).toHaveBeenCalledWith({ email: 'ana@correo.com', password: 'Clave1234', options: { emailRedirectTo: 'focusread://auth/callback' } });
    auth.signUp.mockResolvedValueOnce({ data: { session: { user: {} } as never }, error: null } as never);
    expect((await repo.signUp('a@b.co', 'Clave1234')).needsEmailVerification).toBe(false);
  });

  it('reenvío del correo de verificación con la misma redirección', async () => {
    const { auth, repo } = fakeAuth();
    await repo.resendVerification('ana@correo.com');
    expect(auth.resend).toHaveBeenCalledWith({ type: 'signup', email: 'ana@correo.com', options: { emailRedirectTo: 'focusread://auth/callback' } });
  });

  it('inicio de sesión: devuelve usuario/correo y traduce errores', async () => {
    const { auth, repo } = fakeAuth();
    expect(await repo.signIn('ana@correo.com', 'x')).toEqual({ userId: 'u1', email: 'ana@correo.com' });
    auth.signInWithPassword.mockResolvedValueOnce({ data: { session: null }, error: { code: 'invalid_credentials', message: 'Invalid login credentials' } } as never);
    await expect(repo.signIn('a@b.co', 'mala')).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    auth.signInWithPassword.mockResolvedValueOnce({ data: { session: null }, error: { code: 'email_not_confirmed', message: 'Email not confirmed' } } as never);
    await expect(repo.signIn('a@b.co', 'x')).rejects.toMatchObject({ code: 'EMAIL_NOT_CONFIRMED' });
  });

  it('getSession / cerrar sesión local / notificaciones de cambio', async () => {
    const { auth, repo, emit } = fakeAuth();
    expect(await repo.getSession()).toEqual({ userId: 'u1', email: 'ana@correo.com' });
    const cb = jest.fn();
    const off = repo.onAuthChange(cb);
    emit('SIGNED_IN');
    expect(cb).toHaveBeenLastCalledWith({ userId: 'u1', email: 'ana@correo.com' });
    emit('SIGNED_OUT', null);
    expect(cb).toHaveBeenLastCalledWith(null);
    off();
    await repo.signOut();
    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('recuperar contraseña: redirige a focusread://auth/reset', async () => {
    const { auth, repo } = fakeAuth();
    await repo.requestPasswordReset(' ana@correo.com ');
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith('ana@correo.com', { redirectTo: 'focusread://auth/reset' });
  });

  it('enlace de verificación: extrae el código PKCE, lo intercambia y devuelve "verified"', async () => {
    const { auth, repo } = fakeAuth();
    expect(await repo.handleAuthCallback('focusread://auth/callback?code=abc123')).toBe('verified');
    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith('abc123');
  });

  it('enlace de recuperación: la sesión temporal NO se trata como sesión iniciada hasta cambiar la contraseña', async () => {
    const { auth, repo, emit } = fakeAuth();
    const cb = jest.fn();
    repo.onAuthChange(cb);
    expect(await repo.handleAuthCallback('focusread://auth/reset?code=zzz')).toBe('recovery');
    emit('SIGNED_IN'); // Supabase crea la sesión al canjear el código
    expect(cb).not.toHaveBeenCalled(); // la app sigue en la pantalla de nueva contraseña
    expect(await repo.getSession()).toBeNull();

    await repo.updatePassword('NuevaClave1');
    expect(auth.updateUser).toHaveBeenCalledWith({ password: 'NuevaClave1' });
    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' }); // vuelve al login con la nueva contraseña
    emit('SIGNED_IN');
    expect(cb).toHaveBeenCalledTimes(1); // ya no está suprimido
  });

  it('enlaces inválidos o vencidos → "unknown" y no se queda en modo recuperación', async () => {
    const { auth, repo, emit } = fakeAuth();
    expect(await repo.handleAuthCallback('focusread://auth/callback')).toBe('unknown'); // sin código
    expect(await repo.handleAuthCallback('focusread://otra/ruta?code=x')).toBe('unknown');
    auth.exchangeCodeForSession.mockResolvedValueOnce({ error: { message: 'invalid flow state' } } as never);
    const cb = jest.fn();
    repo.onAuthChange(cb);
    expect(await repo.handleAuthCallback('focusread://auth/reset?code=viejo')).toBe('unknown');
    emit('SIGNED_IN');
    expect(cb).toHaveBeenCalled();
  });

  it('eliminar cuenta: primero la API, luego se cierra la sesión local', async () => {
    const { auth, repo, deleteAccount } = fakeAuth();
    const order: string[] = [];
    deleteAccount.mockImplementation(async () => void order.push('api'));
    auth.signOut.mockImplementation(async () => (order.push('signOut'), { error: null }));
    await repo.deleteAccount();
    expect(order).toEqual(['api', 'signOut']);
    deleteAccount.mockRejectedValueOnce(new AppError('NETWORK_ERROR', 'x'));
    await expect(repo.deleteAccount()).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });

  it('extractAuthCode lee el código en query o fragmento', () => {
    expect(extractAuthCode('focusread://auth/callback?code=a%2Fb&x=1')).toBe('a/b');
    expect(extractAuthCode('exp://192.168.1.2:8081/--/auth/reset#code=q')).toBe('q');
    expect(extractAuthCode('focusread://auth/callback')).toBeNull();
  });
});
