import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomBytes } from 'crypto';

import { LocalArticleRepository } from '../local/LocalArticleRepository';
import { LocalSettingsRepository } from '../local/settingsCache';
import { createTestDb } from '../../test/testDb';
import { makeArticle } from '../../test/fixtures';
import { LargeSecureStore } from './LargeSecureStore';
import { SecureSecretStore } from './SecureSecretStore';

// Keystore simulado en memoria
const mockSecureStore = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (k: string) => mockSecureStore.get(k) ?? null),
  setItemAsync: jest.fn(async (k: string, v: string) => void mockSecureStore.set(k, v)),
  deleteItemAsync: jest.fn(async (k: string) => void mockSecureStore.delete(k)),
}));

const KEY = 'sk-clave-de-prueba-ABC123xyz';

beforeEach(async () => {
  mockSecureStore.clear();
  await AsyncStorage.clear();
});

describe('SecureSecretStore', () => {
  it('guarda, lee y borra una key por proveedor', async () => {
    const store = new SecureSecretStore();
    await store.setAIKey('openai', `  ${KEY}  `);
    await store.setAIKey('groq', 'otra');
    expect(await store.getAIKey('openai')).toBe(KEY);
    expect(await store.getAIKey('groq')).toBe('otra');
    await store.deleteAIKey('openai');
    expect(await store.getAIKey('openai')).toBeNull();
    expect(await store.getAIKey('groq')).toBe('otra');
  });

  it('rechaza una key vacía', async () => {
    await expect(new SecureSecretStore().setAIKey('openai', '   ')).rejects.toThrow();
  });

  it('clearAll elimina las keys de todos los proveedores', async () => {
    const store = new SecureSecretStore();
    for (const p of ['deepseek', 'openai', 'gemini', 'openrouter', 'groq'] as const) await store.setAIKey(p, KEY);
    await store.clearAll();
    expect(mockSecureStore.size).toBe(0);
  });

  it('la key NO aparece en SQLite ni en AsyncStorage', async () => {
    const db = await createTestDb();
    const getDb = async () => db;
    await new SecureSecretStore().setAIKey('deepseek', KEY);

    // Uso normal de la app con datos persistentes
    await new LocalArticleRepository(getDb).save(makeArticle());
    await new LocalSettingsRepository(getDb).update({ aiProvider: 'deepseek', aiModel: 'deepseek-chat' });
    await AsyncStorage.setItem('otra-preferencia', 'valor');

    expect(db.dumpAsText()).not.toContain(KEY);
    const allKeys = await AsyncStorage.getAllKeys();
    const values = await AsyncStorage.multiGet(allKeys);
    expect(JSON.stringify([...allKeys, ...values.flat()])).not.toContain(KEY);
    // y sí está en el keystore
    expect([...mockSecureStore.values()]).toContain(KEY);
  });
});

describe('LargeSecureStore', () => {
  const store = () => new LargeSecureStore({ randomBytes: (n) => new Uint8Array(randomBytes(n)) });
  const SESSION = JSON.stringify({ access_token: 'eyJ.secreto.token', refresh_token: 'r-123', user: { email: 'a@b.co' } });

  it('guarda cifrado y descifra a lo mismo', async () => {
    const s = store();
    await s.setItem('sb-proyecto-auth-token', SESSION);
    expect(await s.getItem('sb-proyecto-auth-token')).toBe(SESSION);
  });

  it('en AsyncStorage solo queda el blob cifrado; la llave va al keystore', async () => {
    const s = store();
    await s.setItem('sb-token', SESSION);
    const blob = await AsyncStorage.getItem('sb-token');
    expect(blob).toBeTruthy();
    expect(blob).not.toContain('secreto');
    expect(blob).not.toContain('access_token');
    expect(mockSecureStore.size).toBe(1);
    const [secureKey, aesKeyHex] = [...mockSecureStore.entries()][0];
    expect(secureKey.startsWith('focusread.lss.')).toBe(true);
    expect(aesKeyHex).toHaveLength(64); // 256 bits en hex
    expect(blob).not.toBe(aesKeyHex);
  });

  it('usa una llave nueva en cada escritura', async () => {
    const s = store();
    await s.setItem('k', SESSION);
    const first = [...mockSecureStore.values()][0];
    await s.setItem('k', SESSION);
    expect([...mockSecureStore.values()][0]).not.toBe(first);
    expect(await s.getItem('k')).toBe(SESSION);
  });

  it('devuelve null si falta la llave o el blob, y removeItem limpia ambos', async () => {
    const s = store();
    expect(await s.getItem('nada')).toBeNull();
    await s.setItem('k', SESSION);
    mockSecureStore.clear(); // se perdió la llave del keystore
    expect(await s.getItem('k')).toBeNull();
    await s.setItem('k', SESSION);
    await s.removeItem('k');
    expect(await AsyncStorage.getItem('k')).toBeNull();
    expect(mockSecureStore.size).toBe(0);
  });

  it('sanea el nombre de la llave para SecureStore', async () => {
    await store().setItem('sb:ref/auth token', 'x');
    expect([...mockSecureStore.keys()][0]).toMatch(/^focusread\.lss\.[A-Za-z0-9._-]+$/);
  });
});
