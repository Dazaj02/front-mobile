import type { UserSettings } from '../domain/contract';
import { DEFAULT_SETTINGS } from '../domain/defaults';
import type { SettingsRepository } from '../domain/ports';
import { createSettingsStore } from './settingsStore';

function memoryRepo(): SettingsRepository & { data: UserSettings } {
  const repo = {
    data: { ...DEFAULT_SETTINGS },
    async get() {
      return { ...repo.data };
    },
    async update(partial: Partial<UserSettings>) {
      repo.data = { ...repo.data, ...partial };
      return { ...repo.data };
    },
  };
  return repo;
}

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe('settingsStore', () => {
  it('persiste tema y tamaño de fuente entre "reinicios"', async () => {
    const repo = memoryRepo();
    const first = createSettingsStore(repo);
    await first.getState().hydrate();
    first.getState().setTheme('dark');
    first.getState().setReaderFontScale(1.3);
    await flush();

    const second = createSettingsStore(repo); // nueva instancia = app reiniciada
    expect(second.getState().theme).toBe('paper');
    await second.getState().hydrate();
    expect(second.getState().theme).toBe('dark');
    expect(second.getState().readerFontScale).toBe(1.3);
    expect(second.getState().hydrated).toBe(true);
  });

  it('ajusta la escala a pasos de 0.1 dentro de 0.8–1.6', async () => {
    const store = createSettingsStore(memoryRepo());
    store.getState().setReaderFontScale(3);
    expect(store.getState().readerFontScale).toBe(1.6);
    store.getState().setReaderFontScale(0.1);
    expect(store.getState().readerFontScale).toBe(0.8);
    store.getState().setReaderFontScale(1.24);
    expect(store.getState().readerFontScale).toBe(1.2);
  });
});
