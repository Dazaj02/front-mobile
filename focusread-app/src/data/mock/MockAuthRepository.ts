import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AuthCallbackResult, AuthRepository, AuthSession } from '../../domain/ports';
import { AppError } from '../../lib/errors';
import { newId } from '../../lib/ids';

const SESSION_KEY = 'focusread.mock-session';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD_LENGTH = 8;

// Autenticación simulada para el modo mock. NO guarda contraseñas: solo valida su formato.
// Persiste únicamente { userId, email } para mantener la sesión entre reinicios.
export class MockAuthRepository implements AuthRepository {
  private session: AuthSession | null = null;
  private loaded = false;
  private readonly unverified = new Set<string>();
  private readonly listeners = new Set<(s: AuthSession | null) => void>();

  async getSession(): Promise<AuthSession | null> {
    await this.load();
    return this.session;
  }

  onAuthChange(cb: (session: AuthSession | null) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  async signUp(email: string, password: string): Promise<{ needsEmailVerification: boolean }> {
    this.validate(email, password);
    this.unverified.add(normalizeEmail(email));
    return { needsEmailVerification: true };
  }

  async signIn(email: string, password: string): Promise<AuthSession> {
    this.validate(email, password);
    const normalized = normalizeEmail(email);
    if (this.unverified.has(normalized)) {
      throw new AppError('EMAIL_NOT_CONFIRMED', 'Verifica tu correo antes de iniciar sesión');
    }
    await this.setSession({ userId: newId(), email: normalized });
    return this.session as AuthSession;
  }

  async signOut(): Promise<void> {
    await this.setSession(null);
  }

  async requestPasswordReset(email: string): Promise<void> {
    if (!EMAIL_RE.test(email.trim())) throw new AppError('VALIDATION_ERROR', 'Correo no válido');
  }

  async updatePassword(newPassword: string): Promise<void> {
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      throw new AppError('VALIDATION_ERROR', `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`);
    }
  }

  // Simula los deep links: auth/callback verifica el último correo pendiente; auth/reset abre la recuperación.
  async handleAuthCallback(url: string): Promise<AuthCallbackResult> {
    if (url.includes('auth/callback')) {
      this.unverified.clear();
      return 'verified';
    }
    if (url.includes('auth/reset')) return 'recovery';
    return 'unknown';
  }

  async deleteAccount(): Promise<void> {
    await this.setSession(null);
  }

  // Solo para modo demo en desarrollo: entrar sin formulario.
  async signInDemo(): Promise<AuthSession> {
    await this.setSession({ userId: newId(), email: 'demo@focusread.local' });
    return this.session as AuthSession;
  }

  private validate(email: string, password: string): void {
    if (!EMAIL_RE.test(email.trim())) throw new AppError('VALIDATION_ERROR', 'Correo no válido');
    if (password.length < MIN_PASSWORD_LENGTH) {
      throw new AppError('INVALID_CREDENTIALS', `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`);
    }
  }

  private async load(): Promise<void> {
    if (this.loaded) return;
    this.loaded = true;
    try {
      const raw = await AsyncStorage.getItem(SESSION_KEY);
      if (raw) this.session = JSON.parse(raw) as AuthSession;
    } catch {
      this.session = null;
    }
  }

  private async setSession(session: AuthSession | null): Promise<void> {
    this.loaded = true;
    this.session = session;
    if (session) await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else await AsyncStorage.removeItem(SESSION_KEY);
    this.listeners.forEach((cb) => cb(session));
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
