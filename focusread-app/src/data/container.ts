import type {
  AIGateway,
  ArticleRepository,
  AuthRepository,
  AuthSession,
  ProgressRepository,
  SecretStore,
  SettingsRepository,
} from '../domain/ports';
import type { SyncService } from '../services/sync/SyncService';
import type { SyncedSettingsRepository } from './offline/SyncedSettingsRepository';
import { getDb } from './local/db';
import { LocalArticleRepository } from './local/LocalArticleRepository';
import { LocalProgressRepository } from './local/LocalProgressRepository';
import { Outbox } from './local/outbox';
import { LocalSettingsRepository } from './local/settingsCache';
import { LocalChunkerGateway } from './mock/LocalChunkerGateway';
import { MockAuthRepository } from './mock/MockAuthRepository';
import { SecureSecretStore } from './secure/SecureSecretStore';

export type DataMode = 'mock' | 'live';

export interface Container {
  mode: DataMode;
  auth: AuthRepository;
  articles: ArticleRepository;
  localArticles: LocalArticleRepository;
  progress: ProgressRepository;
  settings: SettingsRepository;
  ai: AIGateway;
  secrets: SecretStore;
  outbox: Outbox;
  // Solo existe en desarrollo y en modo mock: entrar sin formulario. Nunca en release.
  devSignIn?: () => Promise<AuthSession>;
  // Solo en modo live (F8): sincronización con el servidor. En mock no hay remoto.
  sync?: SyncService;
  settingsSync?: SyncedSettingsRepository;
}

export function readDataMode(value: string | undefined = process.env.EXPO_PUBLIC_DATA_MODE): DataMode {
  return value === 'live' ? 'live' : 'mock';
}

let instance: Container | null = null;

// Elige los adaptadores según EXPO_PUBLIC_DATA_MODE. `live` (Supabase + API) se implementa en F8.
export function getContainer(): Container {
  if (instance) return instance;
  const mode = readDataMode();
  if (mode === 'live') {
    throw new Error('El modo live se implementa en F8: usa EXPO_PUBLIC_DATA_MODE=mock');
  }
  const localArticles = new LocalArticleRepository(getDb);
  const auth = new MockAuthRepository();
  instance = {
    mode,
    auth,
    devSignIn: __DEV__ ? () => auth.signInDemo() : undefined,
    articles: localArticles,
    localArticles,
    progress: new LocalProgressRepository(getDb),
    settings: new LocalSettingsRepository(getDb),
    ai: new LocalChunkerGateway({ articles: localArticles }),
    secrets: new SecureSecretStore(),
    outbox: new Outbox(getDb),
  };
  return instance;
}
