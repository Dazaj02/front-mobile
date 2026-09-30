import * as SecureStore from 'expo-secure-store';

import { ByokProviderIdSchema } from '../../domain/contract';
import type { ByokProviderId, SecretStore } from '../../domain/ports';

const KEY_PREFIX = 'focusread.ai-key.';

// La key BYOK vive SOLO aquí (Keystore de Android). Nunca en SQLite, AsyncStorage ni Supabase.
export class SecureSecretStore implements SecretStore {
  private storageKey(provider: ByokProviderId): string {
    return `${KEY_PREFIX}${provider}`;
  }

  async getAIKey(provider: ByokProviderId): Promise<string | null> {
    return SecureStore.getItemAsync(this.storageKey(provider));
  }

  async setAIKey(provider: ByokProviderId, key: string): Promise<void> {
    const trimmed = key.trim();
    if (trimmed === '') throw new Error('La key no puede estar vacía');
    await SecureStore.setItemAsync(this.storageKey(provider), trimmed);
  }

  async deleteAIKey(provider: ByokProviderId): Promise<void> {
    await SecureStore.deleteItemAsync(this.storageKey(provider));
  }

  async clearAll(): Promise<void> {
    await Promise.all(ByokProviderIdSchema.options.map((p) => this.deleteAIKey(p)));
  }
}
