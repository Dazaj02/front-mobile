import { create } from 'zustand';

import { LocalSettingsRepository } from '../data/local/settingsCache';
import type { UserSettings } from '../domain/contract';
import { DEFAULT_SETTINGS } from '../domain/defaults';
import type { SettingsRepository } from '../domain/ports';
import { clampReaderFontScale } from '../design-system/tokens';
import { logger } from '../lib/logger';

export interface SettingsState extends UserSettings {
  hydrated: boolean;
  hydrate: () => Promise<void>;
  update: (partial: Partial<UserSettings>) => void;
  setTheme: (theme: UserSettings['theme']) => void;
  setReaderFontScale: (scale: number) => void;
}

// La fábrica recibe el repositorio (puerto) para poder sustituirlo en F8 y en tests.
export function createSettingsStore(repo: SettingsRepository) {
  return create<SettingsState>((set, get) => ({
    ...DEFAULT_SETTINGS,
    hydrated: false,

    hydrate: async () => {
      const stored = await repo.get();
      set({ ...stored, hydrated: true });
    },

    // Escritura optimista: la UI cambia al instante y se persiste en segundo plano.
    update: (partial) => {
      const safe = { ...partial };
      if (safe.readerFontScale !== undefined) {
        safe.readerFontScale = clampReaderFontScale(safe.readerFontScale);
      }
      const current = get();
      const previous = Object.fromEntries(
        Object.keys(safe).map((k) => [k, current[k as keyof UserSettings]]),
      ) as Partial<UserSettings>;
      set(safe);
      repo.update(safe).catch((e) => {
        // Si no se pudo persistir, la UI vuelve al valor anterior para no mentir al usuario.
        logger.warn('No se pudo guardar el ajuste', e);
        set(previous);
      });
    },

    setTheme: (theme) => get().update({ theme }),
    setReaderFontScale: (scale) => get().update({ readerFontScale: scale }),
  }));
}

export const useSettingsStore = createSettingsStore(new LocalSettingsRepository());
