import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_SETTINGS } from '../../domain/defaults';
import { LocalSettingsRepository } from './settingsCache';

describe('LocalSettingsRepository', () => {
  beforeEach(() => AsyncStorage.clear());

  it('devuelve los valores por defecto si no hay nada guardado', async () => {
    expect(await new LocalSettingsRepository().get()).toEqual(DEFAULT_SETTINGS);
  });

  it('persiste cambios parciales entre instancias', async () => {
    await new LocalSettingsRepository().update({ theme: 'sepia', readerFontScale: 1.4 });
    const loaded = await new LocalSettingsRepository().get();
    expect(loaded.theme).toBe('sepia');
    expect(loaded.readerFontScale).toBe(1.4);
    expect(loaded.speechRate).toBe(DEFAULT_SETTINGS.speechRate);
  });

  it('ignora datos corruptos y vuelve a los valores por defecto', async () => {
    await AsyncStorage.setItem('focusread.settings.v1', '{"theme":"neon"}');
    expect(await new LocalSettingsRepository().get()).toEqual(DEFAULT_SETTINGS);
  });
});
