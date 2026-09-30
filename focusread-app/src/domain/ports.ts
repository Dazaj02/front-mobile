import type { z } from 'zod';

import type {
  Article,
  ArticleWithDoses,
  ByokProviderIdSchema,
  ProcessArticleRequest,
  ProcessArticleResponse,
  ProviderInfoSchema,
  ReadingSession,
  UsageResponseSchema,
  UserSettings,
} from './contract';

export type ByokProviderId = z.infer<typeof ByokProviderIdSchema>;
export type ProviderInfo = z.infer<typeof ProviderInfoSchema>;
export type UsageInfo = z.infer<typeof UsageResponseSchema>;

// ---------- Auth ----------
export interface AuthSession {
  userId: string;
  email: string;
}

export type AuthCallbackResult = 'verified' | 'recovery' | 'unknown';

export interface AuthRepository {
  getSession(): Promise<AuthSession | null>;
  onAuthChange(cb: (session: AuthSession | null) => void): () => void; // devuelve la función para desuscribirse
  signUp(email: string, password: string): Promise<{ needsEmailVerification: boolean }>;
  resendVerification(email: string): Promise<void>;
  signIn(email: string, password: string): Promise<AuthSession>;
  signOut(): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  updatePassword(newPassword: string): Promise<void>;
  handleAuthCallback(url: string): Promise<AuthCallbackResult>;
  deleteAccount(): Promise<void>;
}

// ---------- Artículos ----------
export interface ArticleFilter {
  query?: string;
  bookmarkedOnly?: boolean;
}

// La app nunca crea artículos directamente: los crea la API (o el fragmentador local en modo mock).
export interface ArticleRepository {
  list(filter?: ArticleFilter): Promise<Article[]>;
  getWithDoses(id: string): Promise<ArticleWithDoses | null>;
  setBookmarked(id: string, value: boolean): Promise<void>;
  remove(id: string): Promise<void>;
}

// ---------- Progreso ----------
export interface ArticleProgress {
  articleId: string;
  completedDoses: number;
  lastReadAt: string | null;
}

export interface ProgressRepository {
  recordSession(session: ReadingSession): Promise<void>;
  listSessions(sinceIso: string): Promise<ReadingSession[]>;
  articleProgress(): Promise<ArticleProgress[]>;
}

// ---------- Ajustes ----------
export interface SettingsRepository {
  get(): Promise<UserSettings>;
  update(partial: Partial<UserSettings>): Promise<UserSettings>;
}

// ---------- IA ----------
export interface AIGateway {
  listProviders(): Promise<ProviderInfo[]>;
  testProvider(provider: ByokProviderId, model: string | undefined, key: string): Promise<void>;
  process(req: ProcessArticleRequest, key?: string): Promise<ProcessArticleResponse>;
  usage(): Promise<UsageInfo>;
}

// ---------- Secretos (solo en el dispositivo) ----------
export interface SecretStore {
  getAIKey(provider: ByokProviderId): Promise<string | null>;
  setAIKey(provider: ByokProviderId, key: string): Promise<void>;
  deleteAIKey(provider: ByokProviderId): Promise<void>;
  clearAll(): Promise<void>;
}
