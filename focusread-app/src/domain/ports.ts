import type { UserSettings } from './contract';

// F4 completa el resto de puertos (Auth, Article, Progress, AIGateway, SecretStore).
export interface SettingsRepository {
  get(): Promise<UserSettings>;
  update(partial: Partial<UserSettings>): Promise<UserSettings>;
}
