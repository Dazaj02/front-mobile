import AsyncStorage from '@react-native-async-storage/async-storage';

import { ArticleWithDosesSchema, type ArticleWithDoses } from '../../domain/contract';
import { countWords, MAX_DOSES, normalizeText } from '../../domain/chunker';
import { readDataMode } from '../container';
import { buildDemoArticles, DEMO_SOURCES } from './demoArticles';
import { LocalChunkerGateway, titleFromText, URL_NEEDS_SERVER_MESSAGE } from './LocalChunkerGateway';
import { MockAuthRepository } from './MockAuthRepository';

const TEXT = Array.from({ length: 4 }, (_, i) => `${'La lectura en dosis cortas ayuda a sostener la atención. '.repeat(14)}Fin del bloque ${i + 1}.`).join('\n\n');

function gateway() {
  const saved: ArticleWithDoses[] = [];
  const gw = new LocalChunkerGateway({ articles: { save: async (a) => void saved.push(a) }, now: () => new Date('2026-09-30T12:00:00.000Z') });
  return { gw, saved };
}

describe('LocalChunkerGateway', () => {
  it('rechaza enlaces con el mensaje acordado y sin inventar contenido', async () => {
    const { gw, saved } = gateway();
    const err = await gw.process({ source: { type: 'url', url: 'https://ejemplo.com/articulo' }, targetDoseMinutes: 2.5 }).catch((e) => e);
    expect(err).toMatchObject({ code: 'URL_FETCH_FAILED', message: 'La importación de enlaces requiere conexión con el servidor' });
    expect(err.message).toBe(URL_NEEDS_SERVER_MESSAGE);
    expect(saved).toHaveLength(0);
  });

  it('valida longitud mínima y máxima del texto', async () => {
    const { gw } = gateway();
    await expect(gw.process({ source: { type: 'text', text: 'corto' }, targetDoseMinutes: 2.5 })).rejects.toMatchObject({ code: 'CONTENT_TOO_SHORT' });
    await expect(gw.process({ source: { type: 'text', text: 'a'.repeat(50_001) }, targetDoseMinutes: 2.5 })).rejects.toMatchObject({ code: 'CONTENT_TOO_LONG' });
  });

  it('fragmenta texto, guarda el artículo y no agrega resumen ni quiz', async () => {
    const { gw, saved } = gateway();
    const { article, warnings } = await gw.process({ source: { type: 'text', text: TEXT }, targetDoseMinutes: 2.5 });
    expect(warnings).toEqual([]);
    expect(saved).toEqual([article]);
    expect(ArticleWithDosesSchema.safeParse(article).success).toBe(true);
    expect(article).toMatchObject({ sourceType: 'text', sourceUrl: null, summaryPoints: [], aiProvider: null, aiModel: null, category: null });
    expect(article.doses.every((d) => d.quiz === null)).toBe(true);
    expect(article.doseCount).toBe(article.doses.length);
    expect(article.doses.length).toBeLessThanOrEqual(MAX_DOSES);
    expect(article.doses.map((d) => d.position)).toEqual(article.doses.map((_, i) => i));
    expect(article.createdAt).toBe('2026-09-30T12:00:00.000Z');
  });

  it('nunca inventa contenido: las dosis contienen exactamente las palabras del texto', async () => {
    const { gw } = gateway();
    const { article } = await gw.process({ source: { type: 'text', text: TEXT }, targetDoseMinutes: 1.5 });
    const joined = article.doses.map((d) => d.content).join(' ');
    expect(countWords(joined)).toBe(countWords(TEXT));
    expect(joined.replace(/\s+/g, ' ')).toBe(normalizeText(TEXT).replace(/\s+/g, ' '));
  });

  it('usa el título dado o las primeras palabras del texto', async () => {
    const { gw } = gateway();
    const a = (await gw.process({ source: { type: 'text', text: TEXT, title: '  Mi título ' }, targetDoseMinutes: 2.5 })).article;
    const b = (await gw.process({ source: { type: 'text', text: TEXT }, targetDoseMinutes: 2.5 })).article;
    expect(a.title).toBe('Mi título');
    expect(b.title).toBe('La lectura en dosis cortas ayuda a sostener');
    expect(titleFromText('hola mundo.')).toBe('Hola mundo');
  });

  it('lista los proveedores (solo FocusRead sin key) y no permite probar keys ni usarlos sin servidor', async () => {
    const { gw } = gateway();
    const providers = await gw.listProviders();
    expect(providers.map((p) => p.id)).toEqual(['focusread', 'deepseek', 'openai', 'gemini', 'openrouter', 'groq']);
    expect(providers.filter((p) => !p.requiresUserKey).map((p) => p.id)).toEqual(['focusread']);
    await expect(gw.process({ source: { type: 'text', text: TEXT }, targetDoseMinutes: 2.5, provider: 'openai' })).rejects.toMatchObject({ code: 'PROVIDER_UNAVAILABLE' });
    await expect(gw.testProvider('openai', undefined, 'k')).rejects.toMatchObject({ code: 'PROVIDER_UNAVAILABLE', message: 'Disponible con el servidor' });
  });
});

describe('demoArticles', () => {
  it('genera artículos válidos según el contrato, marcados como demo', () => {
    const articles = buildDemoArticles(2.5);
    expect(articles).toHaveLength(DEMO_SOURCES.length);
    for (const a of articles) {
      expect(ArticleWithDosesSchema.safeParse(a).success).toBe(true);
      expect(a.sourceType).toBe('demo');
      expect(a.doseCount).toBeGreaterThanOrEqual(1);
      expect(a.doses.filter((d) => d.quiz).length).toBe(1);
      expect(a.doses[a.doses.length - 1].quiz).not.toBeNull();
    }
  });

  it('cada artículo tiene varias dosis con la duración por defecto (2.5 min)', () => {
    for (const a of buildDemoArticles(2.5)) expect(a.doseCount).toBeGreaterThanOrEqual(2);
  });

  it('respeta la duración objetivo: dosis más cortas producen más dosis', () => {
    const short = buildDemoArticles(1.5)[0].doseCount;
    const long = buildDemoArticles(3.5)[0].doseCount;
    expect(short).toBeGreaterThan(long);
  });

  it('los ids son únicos', () => {
    const ids = buildDemoArticles().flatMap((a) => [a.id, ...a.doses.map((d) => d.id)]);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('MockAuthRepository', () => {
  beforeEach(() => AsyncStorage.clear());

  it('valida formato de correo y longitud de contraseña (8+)', async () => {
    const auth = new MockAuthRepository();
    await expect(auth.signIn('no-es-correo', 'password1')).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    await expect(auth.signIn('a@b.co', 'corta')).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    await expect(auth.signUp('a@b.co', '1234567')).rejects.toBeTruthy();
    expect(await auth.getSession()).toBeNull();
  });

  it('acepta cualquier correo válido con contraseña de 8+ caracteres', async () => {
    const auth = new MockAuthRepository();
    const session = await auth.signIn('  Ana@Correo.COM ', 'cualquiera8');
    expect(session.email).toBe('ana@correo.com');
    expect((await auth.getSession())?.userId).toBe(session.userId);
  });

  it('NO guarda contraseñas en ningún lado', async () => {
    const auth = new MockAuthRepository();
    const password = 'MiClaveSecreta123';
    await auth.signUp('ana@correo.com', password);
    await auth.handleAuthCallback('focusread://auth/callback?code=x');
    await auth.signIn('ana@correo.com', password);
    const keys = await AsyncStorage.getAllKeys();
    const entries = await AsyncStorage.multiGet(keys);
    expect(JSON.stringify(entries)).not.toContain(password);
    expect(JSON.stringify(auth)).not.toContain(password);
  });

  it('simula la verificación de correo: sin confirmar no se puede entrar', async () => {
    const auth = new MockAuthRepository();
    expect(await auth.signUp('nuevo@correo.com', 'password123')).toEqual({ needsEmailVerification: true });
    await expect(auth.signIn('nuevo@correo.com', 'password123')).rejects.toMatchObject({ code: 'EMAIL_NOT_CONFIRMED' });
    expect(await auth.handleAuthCallback('focusread://auth/callback?code=abc')).toBe('verified');
    await expect(auth.signIn('nuevo@correo.com', 'password123')).resolves.toMatchObject({ email: 'nuevo@correo.com' });
  });

  it('interpreta los deep links de callback y recuperación', async () => {
    const auth = new MockAuthRepository();
    expect(await auth.handleAuthCallback('focusread://auth/reset')).toBe('recovery');
    expect(await auth.handleAuthCallback('focusread://otra/cosa')).toBe('unknown');
  });

  it('la sesión persiste entre instancias y se borra al cerrar sesión o eliminar cuenta', async () => {
    const a = new MockAuthRepository();
    await a.signIn('ana@correo.com', 'password123');
    const b = new MockAuthRepository(); // app reiniciada
    expect((await b.getSession())?.email).toBe('ana@correo.com');
    await b.signOut();
    expect(await new MockAuthRepository().getSession()).toBeNull();
    await b.signIn('ana@correo.com', 'password123');
    await b.deleteAccount();
    expect(await new MockAuthRepository().getSession()).toBeNull();
  });

  it('notifica los cambios de sesión y permite desuscribirse', async () => {
    const auth = new MockAuthRepository();
    const cb = jest.fn();
    const off = auth.onAuthChange(cb);
    await auth.signIn('ana@correo.com', 'password123');
    expect(cb).toHaveBeenLastCalledWith(expect.objectContaining({ email: 'ana@correo.com' }));
    off();
    await auth.signOut();
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('valida la nueva contraseña al actualizarla', async () => {
    const auth = new MockAuthRepository();
    await expect(auth.updatePassword('corta')).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    await expect(auth.updatePassword('suficiente1')).resolves.toBeUndefined();
  });
});

describe('container', () => {
  it('elige mock por defecto y solo live cuando se pide explícitamente', () => {
    expect(readDataMode(undefined)).toBe('mock');
    expect(readDataMode('')).toBe('mock');
    expect(readDataMode('cualquier-cosa')).toBe('mock');
    expect(readDataMode('live')).toBe('live');
  });
});
