import { createLiveContainer, readLiveEnv } from './liveContainer';
import { HttpAIGateway } from './api/HttpAIGateway';
import { SupabaseAuthRepository } from './remote/SupabaseAuthRepository';
import { isCloudAvailable, registerCloudSpeaker } from '../services/tts';

const mockStore = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (k: string) => mockStore.get(k) ?? null),
  setItemAsync: jest.fn(async (k: string, v: string) => void mockStore.set(k, v)),
  deleteItemAsync: jest.fn(async (k: string) => void mockStore.delete(k)),
}));

const ENV = { apiUrl: 'https://api.test', supabaseUrl: 'https://abc.supabase.co', supabaseAnonKey: 'anon-publica', isDev: false };

describe('configuración del modo live', () => {
  it('avisa con claridad qué variables faltan', () => {
    expect(() => readLiveEnv({ isDev: true })).toThrow(/EXPO_PUBLIC_API_URL.*EXPO_PUBLIC_SUPABASE_URL.*EXPO_PUBLIC_SUPABASE_ANON_KEY/);
    expect(() => readLiveEnv({ apiUrl: 'https://x.test', isDev: true })).toThrow(/SUPABASE_URL/);
  });

  it('en release exige HTTPS para la API', () => {
    expect(() => readLiveEnv({ ...ENV, apiUrl: 'http://api.test' })).toThrow(/HTTPS/);
    expect(readLiveEnv({ ...ENV, apiUrl: 'http://10.0.2.2:8787', isDev: true }).apiUrl).toBe('http://10.0.2.2:8787');
  });
});

describe('createLiveContainer', () => {
  beforeEach(() => {
    mockStore.clear();
    registerCloudSpeaker(null);
  });

  it('cablea Supabase Auth, el gateway de IA y la capa offline (caché, outbox, sincronización)', () => {
    const c = createLiveContainer(ENV);
    expect(c.mode).toBe('live');
    expect(c.auth).toBeInstanceOf(SupabaseAuthRepository);
    expect(c.ai).toBeInstanceOf(HttpAIGateway);
    expect(c.sync).toBeDefined();
    expect(c.settingsSync).toBeDefined();
    expect(c.outbox).toBeDefined();
    expect(c.devSignIn).toBeUndefined(); // nunca hay "modo demo" en live
    expect(c.localArticles).toBeDefined();
  });

  it('las voces en la nube están apagadas por defecto y solo se activan con EXPO_PUBLIC_CLOUD_TTS=1', () => {
    expect(createLiveContainer(ENV).tts).toBeUndefined();
    expect(isCloudAvailable()).toBe(false);
    const c = createLiveContainer({ ...ENV, cloudTts: '1' });
    expect(c.tts).toBeDefined();
    expect(isCloudAvailable()).toBe(true);
  });

  it('warmUp llama a /health sin autenticación y nunca falla', async () => {
    const fetchMock = jest.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    const original = globalThis.fetch;
    globalThis.fetch = fetchMock as never;
    try {
      const c = createLiveContainer(ENV);
      await c.warmUp?.();
      expect(fetchMock).toHaveBeenCalledWith('https://api.test/health');
      fetchMock.mockRejectedValueOnce(new Error('dormido'));
      await expect(c.warmUp?.()).resolves.toBeUndefined();
    } finally {
      globalThis.fetch = original;
    }
  });

});
