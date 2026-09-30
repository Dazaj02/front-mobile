import AsyncStorage from '@react-native-async-storage/async-storage';

import { UserSettingsSchema, type UserSettings } from '../../domain/contract';
import { DEFAULT_SETTINGS } from '../../domain/defaults';
import type { SettingsRepository } from '../../domain/ports';

const STORAGE_KEY = 'focusread.settings.v1';

// Versión local de SettingsRepository (F1). En F4 pasa a la tabla `settings` de SQLite.
export class LocalSettingsRepository implements SettingsRepository {
  async get(): Promise<UserSettings> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULT_SETTINGS };
      const parsed = UserSettingsSchema.safeParse({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) });
      return parsed.success ? parsed.data : { ...DEFAULT_SETTINGS };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  async update(partial: Partial<UserSettings>): Promise<UserSettings> {
    const next = UserSettingsSchema.parse({ ...(await this.get()), ...partial });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  }
}
