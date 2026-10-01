import 'react-native-url-polyfill/auto'; // debe ir antes de @supabase/supabase-js
import { AppState } from 'react-native';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { LargeSecureStore } from '../secure/LargeSecureStore';

export type FocusReadSupabaseClient = SupabaseClient;

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

// La anon key es pública por diseño (la protege RLS). La clave de servicio (privada) NUNCA llega a la app.
export function createSupabaseClient(config: SupabaseConfig, storage = new LargeSecureStore()): FocusReadSupabaseClient {
  return createClient(config.url, config.anonKey, {
    auth: {
      storage, // la sesión se guarda cifrada (AES-256) con la llave en SecureStore
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false, // RN no tiene URL de navegador: el código se intercambia a mano (PKCE)
      flowType: 'pkce',
    },
  });
}

// El refresco automático del token solo corre con la app en primer plano.
export function bindAutoRefresh(client: FocusReadSupabaseClient): () => void {
  const apply = (state: string) => {
    if (state === 'active') void client.auth.startAutoRefresh();
    else void client.auth.stopAutoRefresh();
  };
  apply(AppState.currentState);
  const sub = AppState.addEventListener('change', apply);
  return () => sub.remove();
}
