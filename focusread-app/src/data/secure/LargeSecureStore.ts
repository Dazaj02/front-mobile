import AsyncStorage from '@react-native-async-storage/async-storage';
import * as aesjs from 'aes-js';
import * as SecureStore from 'expo-secure-store';

// Patrón recomendado por Supabase para React Native: SecureStore limita el tamaño de los valores
// (~2 KB) y una sesión es más grande. Se cifra con AES-256-CTR, la llave aleatoria va a SecureStore
// y el blob cifrado a AsyncStorage. Implementa la interfaz de `auth.storage` de supabase-js.
// Requiere `react-native-get-random-values` cargado al arrancar (index.ts).
export interface LargeSecureStoreOptions {
  randomBytes?: (length: number) => Uint8Array;
}

const KEY_PREFIX = 'focusread.lss.';
const AES_KEY_BYTES = 32;

function defaultRandomBytes(length: number): Uint8Array {
  return globalThis.crypto.getRandomValues(new Uint8Array(length));
}

// SecureStore solo admite [A-Za-z0-9._-]
function secureKey(key: string): string {
  return `${KEY_PREFIX}${key.replace(/[^A-Za-z0-9._-]/g, '_')}`;
}

export class LargeSecureStore {
  private readonly randomBytes: (length: number) => Uint8Array;

  constructor(options: LargeSecureStoreOptions = {}) {
    this.randomBytes = options.randomBytes ?? defaultRandomBytes;
  }

  async getItem(key: string): Promise<string | null> {
    const encrypted = await AsyncStorage.getItem(key);
    if (!encrypted) return null;
    const keyHex = await SecureStore.getItemAsync(secureKey(key));
    if (!keyHex) return null;
    return this.decrypt(keyHex, encrypted);
  }

  async setItem(key: string, value: string): Promise<void> {
    const aesKey = this.randomBytes(AES_KEY_BYTES); // llave nueva en cada escritura
    const cipher = new aesjs.ModeOfOperation.ctr(aesKey, new aesjs.Counter(1));
    const encrypted = aesjs.utils.hex.fromBytes(cipher.encrypt(aesjs.utils.utf8.toBytes(value)));
    await SecureStore.setItemAsync(secureKey(key), aesjs.utils.hex.fromBytes(aesKey));
    await AsyncStorage.setItem(key, encrypted);
  }

  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
    await SecureStore.deleteItemAsync(secureKey(key));
  }

  private decrypt(keyHex: string, encryptedHex: string): string {
    const cipher = new aesjs.ModeOfOperation.ctr(aesjs.utils.hex.toBytes(keyHex), new aesjs.Counter(1));
    return aesjs.utils.utf8.fromBytes(cipher.decrypt(aesjs.utils.hex.toBytes(encryptedHex)));
  }
}
