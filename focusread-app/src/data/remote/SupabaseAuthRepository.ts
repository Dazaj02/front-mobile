import type { Session } from '@supabase/supabase-js';

import type { AuthCallbackResult, AuthRepository, AuthSession } from '../../domain/ports';
import { toAuthError } from './supabaseErrors';
import type { FocusReadSupabaseClient } from './supabaseClient';

export interface SupabaseAuthDeps {
  // DELETE /v1/account (la API borra el usuario en Supabase Auth; los datos caen en cascada)
  deleteAccount: () => Promise<void>;
  // "auth/callback" → focusread://auth/callback (en Expo Go: exp://…/--/auth/callback)
  redirectTo: (path: string) => string;
}

const toSession = (s: Session | null): AuthSession | null => (s ? { userId: s.user.id, email: s.user.email ?? '' } : null);

export function extractAuthCode(url: string): string | null {
  const match = /[?&#]code=([^&#]+)/.exec(url);
  return match ? decodeURIComponent(match[1]) : null;
}

export class SupabaseAuthRepository implements AuthRepository {
  // Durante la recuperación de contraseña Supabase crea una sesión temporal: la app no debe tratarla
  // como "sesión iniciada" (saltaría la pantalla de nueva contraseña). Se oculta hasta terminar.
  private recovering = false;

  constructor(
    private readonly client: FocusReadSupabaseClient,
    private readonly deps: SupabaseAuthDeps,
  ) {}

  async getSession(): Promise<AuthSession | null> {
    if (this.recovering) return null;
    const { data, error } = await this.client.auth.getSession();
    if (error) throw toAuthError(error);
    return toSession(data.session);
  }

  onAuthChange(cb: (session: AuthSession | null) => void): () => void {
    const { data } = this.client.auth.onAuthStateChange((event, session) => {
      if (this.recovering && event !== 'SIGNED_OUT') return;
      cb(toSession(session));
    });
    return () => data.subscription.unsubscribe();
  }

  async signUp(email: string, password: string): Promise<{ needsEmailVerification: boolean }> {
    const { data, error } = await this.client.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: this.deps.redirectTo('auth/callback') },
    });
    if (error) throw toAuthError(error);
    return { needsEmailVerification: data.session === null };
  }

  async resendVerification(email: string): Promise<void> {
    const { error } = await this.client.auth.resend({
      type: 'signup',
      email: email.trim(),
      options: { emailRedirectTo: this.deps.redirectTo('auth/callback') },
    });
    if (error) throw toAuthError(error);
  }

  async signIn(email: string, password: string): Promise<AuthSession> {
    const { data, error } = await this.client.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw toAuthError(error);
    return toSession(data.session) as AuthSession;
  }

  async signOut(): Promise<void> {
    this.recovering = false;
    const { error } = await this.client.auth.signOut({ scope: 'local' });
    if (error) throw toAuthError(error);
  }

  async requestPasswordReset(email: string): Promise<void> {
    const { error } = await this.client.auth.resetPasswordForEmail(email.trim(), { redirectTo: this.deps.redirectTo('auth/reset') });
    if (error) throw toAuthError(error);
  }

  // Cambia la contraseña con la sesión de recuperación y vuelve a la pantalla de inicio de sesión.
  async updatePassword(newPassword: string): Promise<void> {
    const { error } = await this.client.auth.updateUser({ password: newPassword });
    if (error) throw toAuthError(error);
    this.recovering = false;
    await this.client.auth.signOut({ scope: 'local' });
  }

  // Intercambia el código PKCE del enlace del correo por una sesión.
  async handleAuthCallback(url: string): Promise<AuthCallbackResult> {
    const isReset = url.includes('auth/reset');
    const isCallback = url.includes('auth/callback');
    if (!isReset && !isCallback) return 'unknown';
    const code = extractAuthCode(url);
    if (!code) return 'unknown';

    if (isReset) this.recovering = true; // antes del intercambio, para ocultar el SIGNED_IN
    const { error } = await this.client.auth.exchangeCodeForSession(code);
    if (error) {
      this.recovering = false;
      return 'unknown'; // enlace inválido, usado o vencido
    }
    return isReset ? 'recovery' : 'verified';
  }

  async deleteAccount(): Promise<void> {
    await this.deps.deleteAccount();
    await this.client.auth.signOut({ scope: 'local' }).catch(() => undefined); // el usuario ya no existe
  }
}
