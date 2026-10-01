import type {
  AIGateway,
  ArticleRepository,
  AuthRepository,
  AuthSession,
  ProgressRepository,
  SecretStore,
  SettingsRepository,
} from '../domain/ports';
import type { CloudTtsGateway } from './api/HttpTtsGateway';
import type { SyncService } from '../services/sync/SyncService';
import type { SyncedSettingsRepository } from './offline/SyncedSettingsRepository';
import { createLiveContainer } from './liveContainer';
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
  // Voces de alta calidad vía backend (propuesta temporal, ver docs/PROPUESTA_TTS_NUBE.md). Solo live.
  tts?: CloudTtsGateway;
  // Solo live: despierta el servidor (Render gratis duerme a los 15 min) sin esperar la respuesta.
  warmUp?: () => Promise<void>;
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
    // Las variables EXPO_PUBLIC_* se sustituyen en la compilación: deben leerse con su nombre literal.
    instance = createLiveContainer({
      apiUrl: process.env.EXPO_PUBLIC_API_URL,
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      cloudTts: process.env.EXPO_PUBLIC_CLOUD_TTS,
      isDev: __DEV__,
    });
    return instance;
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
