import * as Linking from 'expo-linking';

import type { Container } from './container';
import { assertSecureApiUrl, createHttpClient } from './api/httpClient';
import { HttpAIGateway } from './api/HttpAIGateway';
import { HttpTtsGateway } from './api/HttpTtsGateway';
import { getDb } from './local/db';
import { composeOffline } from './offline/composeOffline';
import { SecureSecretStore } from './secure/SecureSecretStore';
import { SupabaseArticleRepository } from './remote/SupabaseArticleRepository';
import { SupabaseAuthRepository } from './remote/SupabaseAuthRepository';
import { SupabaseProgressRepository } from './remote/SupabaseProgressRepository';
import { SupabaseSettingsRemote } from './remote/SupabaseSettingsRemote';
import { bindAutoRefresh, createSupabaseClient } from './remote/supabaseClient';
import { getIsOnline } from '../services/network';
import { enableCloudTts } from '../services/tts/enableCloudTts';

export interface LiveEnv {
  apiUrl?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  cloudTts?: string; // "1" activa las voces en la nube (cuando exista el backend)
  isDev: boolean;
}

// Falla con un mensaje claro si falta configuración (en lugar de errores raros de red después).
export function readLiveEnv(env: LiveEnv): { apiUrl: string; supabaseUrl: string; supabaseAnonKey: string } {
  const missing = [
    !env.apiUrl && 'EXPO_PUBLIC_API_URL',
    !env.supabaseUrl && 'EXPO_PUBLIC_SUPABASE_URL',
    !env.supabaseAnonKey && 'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  ].filter(Boolean);
  if (missing.length > 0) throw new Error(`Modo live: faltan ${missing.join(', ')} en el .env`);
  return {
    apiUrl: assertSecureApiUrl(env.apiUrl as string, env.isDev),
    supabaseUrl: (env.supabaseUrl as string).trim(),
    supabaseAnonKey: (env.supabaseAnonKey as string).trim(),
  };
}

// Modo live: Supabase Auth + Postgres (con RLS) para datos y la API propia para procesar con IA.
export function createLiveContainer(env: LiveEnv): Container {
  const { apiUrl, supabaseUrl, supabaseAnonKey } = readLiveEnv(env);
  const supabase = createSupabaseClient({ url: supabaseUrl, anonKey: supabaseAnonKey });
  bindAutoRefresh(supabase);

  const http = createHttpClient({
    baseUrl: apiUrl,
    getToken: async () => (await supabase.auth.getSession()).data.session?.access_token ?? null,
    onUnauthorized: async () => {
      const { data, error } = await supabase.auth.refreshSession();
      return error ? null : (data.session?.access_token ?? null);
    },
    onSessionExpired: () => void supabase.auth.signOut({ scope: 'local' }),
  });

  const auth = new SupabaseAuthRepository(supabase, {
    deleteAccount: () => http.request('/v1/account', { method: 'DELETE' }),
    redirectTo: (path) => Linking.createURL(path),
  });

  const offline = composeOffline(
    getDb,
    {
      articles: new SupabaseArticleRepository(supabase),
      progress: new SupabaseProgressRepository(supabase),
      settings: new SupabaseSettingsRemote(supabase),
    },
    getIsOnline,
  );

  const tts = env.cloudTts === '1' ? new HttpTtsGateway(http) : undefined;
  if (tts) enableCloudTts(tts);

  return {
    mode: 'live',
    auth,
    articles: offline.articles,
    localArticles: offline.localArticles,
    progress: offline.progress,
    settings: offline.settings,
    ai: new HttpAIGateway(http),
    secrets: new SecureSecretStore(),
    outbox: offline.outbox,
    sync: offline.sync,
    settingsSync: offline.settings,
    tts,
    warmUp: () => fetch(`${apiUrl}/health`).then(() => undefined, () => undefined),
  };
}
