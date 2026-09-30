import { create } from 'zustand';

import { getContainer } from '../data/container';
import type { AuthRepository, AuthSession } from '../domain/ports';

export type SessionStatus = 'loading' | 'signedOut' | 'signedIn';

export interface SessionState {
  status: SessionStatus;
  session: AuthSession | null;
  init: () => Promise<void>;
  signOut: () => Promise<void>;
}

// La fábrica recibe el repositorio para poder probar sin el contenedor real.
export function createSessionStore(getAuth: () => AuthRepository) {
  let unsubscribe: (() => void) | null = null;
  return create<SessionState>((set) => ({
    status: 'loading',
    session: null,

    init: async () => {
      const auth = getAuth();
      unsubscribe?.();
      unsubscribe = auth.onAuthChange((session) => set({ session, status: session ? 'signedIn' : 'signedOut' }));
      const session = await auth.getSession();
      set({ session, status: session ? 'signedIn' : 'signedOut' });
    },

    // F7 añade aquí el flush de la outbox y la limpieza de datos locales antes de cerrar.
    signOut: async () => {
      await getAuth().signOut();
    },
  }));
}

export const useSessionStore = createSessionStore(() => getContainer().auth);
