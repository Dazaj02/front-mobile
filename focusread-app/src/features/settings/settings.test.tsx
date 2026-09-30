import { Linking } from 'react-native';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { DEFAULT_SETTINGS } from '../../domain/defaults';
import { es } from '../../i18n/es';
import { useSessionStore } from '../../state/sessionStore';
import { useSettingsStore } from '../../state/settingsStore';
import { createTestContainer, renderScreen, type TestContainer } from '../../test/testContainer';
import * as tts from '../../services/tts';
import { SettingsScreen } from './SettingsScreen';

let mockC: TestContainer;
jest.mock('../../data/container', () => ({ getContainer: () => mockC }));
jest.mock('../../services/tts', () => ({
  loadSpanishVoices: jest.fn(),
  speak: jest.fn(),
  stop: jest.fn(),
  speakAny: jest.fn(),
  stopAny: jest.fn(),
}));

const VOICES = [
  { id: 'es-mx-1', name: 'Paulina', language: 'es-MX' },
  { id: 'es-es-1', name: 'Jorge', language: 'es-ES' },
];
const renderSettings = () => renderScreen('Settings', SettingsScreen, { extraScreens: ['AIEngine', 'Account', 'DevCatalog'] });
const persisted = async () => mockC.settings.get();

beforeEach(async () => {
  jest.clearAllMocks();
  mockC = await createTestContainer();
  (tts.loadSpanishVoices as jest.Mock).mockResolvedValue(VOICES);
  useSettingsStore.setState({ ...DEFAULT_SETTINGS, hydrated: true });
  useSessionStore.setState({ status: 'signedIn', session: { userId: 'u', email: 'ana@correo.com' } });
});

describe('Ajustes › Apariencia', () => {
  it('cambiar tema y tamaño de letra se guarda en SQLite', async () => {
    await renderSettings();
    await fireEvent.press(await screen.findByRole('radio', { name: es.settings.themes.sepia }));
    await fireEvent.press(screen.getByRole('button', { name: 'Aumentar tamaño de letra' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Aumentar tamaño de letra' }));
    expect(useSettingsStore.getState()).toMatchObject({ theme: 'sepia', readerFontScale: 1.2 });
    await waitFor(async () => expect(await persisted()).toMatchObject({ theme: 'sepia', readerFontScale: 1.2 }));
  });

  it('el tema activo aparece marcado', async () => {
    useSettingsStore.setState({ theme: 'dark' });
    await renderSettings();
    expect((await screen.findByRole('radio', { name: es.settings.themes.dark })).props.accessibilityState).toMatchObject({ checked: true });
  });
});

describe('Ajustes › Lectura', () => {
  it('la duración objetivo y el quiz se guardan', async () => {
    await renderSettings();
    await fireEvent.press(await screen.findByRole('button', { name: es.settings.doseMinutes(3.5) }));
    await fireEvent(screen.getByRole('switch', { name: es.settings.quiz }), 'valueChange', false);
    expect(useSettingsStore.getState()).toMatchObject({ targetDoseMinutes: 3.5, quizEnabled: false });
    await waitFor(async () => expect(await persisted()).toMatchObject({ targetDoseMinutes: 3.5, quizEnabled: false }));
  });
});

describe('Ajustes › Voz', () => {
  it('lista solo las voces reales del sistema y permite elegirlas', async () => {
    await renderSettings();
    expect(await screen.findByRole('radio', { name: 'Paulina, es-MX' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Jorge, es-ES' })).toBeTruthy();
    // sin "personas" inventadas
    for (const fake of ['Elena', 'Marcos', 'Lucía', 'Mateo', 'Sofía']) expect(screen.queryByText(new RegExp(fake))).toBeNull();

    await fireEvent.press(screen.getByRole('radio', { name: 'Jorge, es-ES' }));
    expect(useSettingsStore.getState().voiceId).toBe('es-es-1');
    await waitFor(async () => expect((await persisted()).voiceId).toBe('es-es-1'));
    await fireEvent.press(screen.getByRole('radio', { name: `${es.settings.voiceSystemDefault}, es` }));
    expect(useSettingsStore.getState().voiceId).toBeNull();
  });

  describe('voces de alta calidad (servidor, temporal)', () => {
    const CLOUD = [
      { id: 'es-MX-JorgeNeural', name: 'Jorge', language: 'es-MX', gender: 'male' as const },
      { id: 'es-MX-DaliaNeural', name: 'Dalia', language: 'es-MX', gender: 'female' as const },
    ];

    it('sin servidor (mock) explica que llegarán con el servidor', async () => {
      await renderSettings();
      expect(await screen.findByText(es.settings.cloudVoicesMock)).toBeTruthy();
    });

    it('con servidor lista voces masculinas y femeninas reales y permite elegirlas (prefijo cloud:)', async () => {
      mockC.tts = { listVoices: jest.fn(async () => CLOUD), synthesize: jest.fn() };
      await renderSettings();
      expect(await screen.findByRole('radio', { name: 'Jorge, es-MX · Masculina' })).toBeTruthy();
      expect(screen.getByRole('radio', { name: 'Dalia, es-MX · Femenina' })).toBeTruthy();

      await fireEvent.press(screen.getByRole('radio', { name: 'Jorge, es-MX · Masculina' }));
      expect(useSettingsStore.getState().voiceId).toBe('cloud:es-MX-JorgeNeural');
      await waitFor(async () => expect((await persisted()).voiceId).toBe('cloud:es-MX-JorgeNeural'));
      expect(screen.getByRole('radio', { name: 'Jorge, es-MX · Masculina' }).props.accessibilityState).toMatchObject({ checked: true });
    });

    it('probar una voz de la nube la pide por su id con prefijo', async () => {
      mockC.tts = { listVoices: jest.fn(async () => CLOUD), synthesize: jest.fn() };
      await renderSettings();
      await fireEvent.press(await screen.findByRole('button', { name: 'Probar voz Dalia' }));
      expect(tts.speakAny).toHaveBeenCalledWith(es.settings.voiceTestSample, expect.objectContaining({ voiceId: 'cloud:es-MX-DaliaNeural' }));
    });

    it('si el servidor no las tiene disponibles lo dice y se sigue con la voz del sistema', async () => {
      mockC.tts = { listVoices: jest.fn().mockRejectedValue(new Error('404')), synthesize: jest.fn() };
      await renderSettings();
      expect(await screen.findByText(es.settings.cloudVoicesUnavailable)).toBeTruthy();
      expect(screen.getByRole('radio', { name: 'Paulina, es-MX' })).toBeTruthy(); // las del sistema siguen ahí
    });
  });

  it('si no hay voces en español lo dice', async () => {
    (tts.loadSpanishVoices as jest.Mock).mockResolvedValue([]);
    await renderSettings();
    expect(await screen.findByText(es.settings.voicesEmpty)).toBeTruthy();
  });

  it('muestra un indicador mientras busca voces', async () => {
    (tts.loadSpanishVoices as jest.Mock).mockReturnValue(new Promise(() => {}));
    await renderSettings();
    expect(await screen.findByText(es.settings.voicesLoading)).toBeTruthy();
  });

  it('velocidad y tono (0.5–2) se guardan al soltar el deslizador', async () => {
    await renderSettings();
    const rate = await screen.findByLabelText(es.settings.voiceRate);
    expect(rate.props).toMatchObject({ minimumValue: 0.5, maximumValue: 2, step: 0.1 });
    await fireEvent(rate, 'slidingComplete', 1.5);
    await fireEvent(screen.getByLabelText(es.settings.voicePitch), 'slidingComplete', 0.7);
    expect(useSettingsStore.getState()).toMatchObject({ speechRate: 1.5, speechPitch: 0.7 });
    await waitFor(async () => expect(await persisted()).toMatchObject({ speechRate: 1.5, speechPitch: 0.7 }));
  });

  it('permite abrir los ajustes de voz del sistema para instalar más voces y actualizar la lista', async () => {
    const send = jest.spyOn(Linking, 'sendIntent').mockResolvedValue();
    await renderSettings();
    await fireEvent.press(await screen.findByRole('button', { name: es.settings.voiceSystemSettings }));
    expect(send).toHaveBeenCalledWith('android.settings.TTS_SETTINGS');

    (tts.loadSpanishVoices as jest.Mock).mockClear();
    await fireEvent.press(screen.getByRole('button', { name: es.settings.voiceRefresh }));
    await waitFor(() => expect(tts.loadSpanishVoices).toHaveBeenCalledTimes(1));
    send.mockRestore();
  });

  it('"Probar" habla con la voz, velocidad y tono actuales', async () => {
    useSettingsStore.setState({ voiceId: 'es-mx-1', speechRate: 1.25, speechPitch: 0.9 });
    await renderSettings();
    await fireEvent.press(await screen.findByRole('button', { name: es.settings.voiceTest }));
    expect(tts.speakAny).toHaveBeenCalledWith(es.settings.voiceTestSample, { voiceId: 'es-mx-1', rate: 1.25, pitch: 0.9 });
  });

  it('el botón de probar de cada voz usa esa voz', async () => {
    await renderSettings();
    await fireEvent.press(await screen.findByRole('button', { name: 'Probar voz Jorge' }));
    expect(tts.speakAny).toHaveBeenCalledWith(es.settings.voiceTestSample, expect.objectContaining({ voiceId: 'es-es-1' }));
  });
});

describe('Ajustes › Accesibilidad', () => {
  it('el switch de vibración se guarda y al activarlo vibra de inmediato', async () => {
    const Haptics = jest.requireMock('expo-haptics');
    useSettingsStore.setState({ hapticsEnabled: false });
    await renderSettings();
    const sw = await screen.findByRole('switch', { name: es.settings.haptics });
    expect(sw.props.accessibilityState).toMatchObject({ checked: false });

    await fireEvent(sw, 'valueChange', true);
    expect(useSettingsStore.getState().hapticsEnabled).toBe(true);
    await waitFor(() => expect(Haptics.impactAsync).toHaveBeenCalledTimes(1));
    await waitFor(async () => expect((await persisted()).hapticsEnabled).toBe(true));

    Haptics.impactAsync.mockClear();
    await fireEvent(screen.getByRole('switch', { name: es.settings.haptics }), 'valueChange', false);
    expect(useSettingsStore.getState().hapticsEnabled).toBe(false);
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
  });

  it('informa del ajuste "reducir movimiento" del sistema', async () => {
    await renderSettings();
    expect(await screen.findByText(es.settings.reduceMotionOff)).toBeTruthy();
  });
});

describe('Ajustes › Motor de IA y Cuenta', () => {
  it('la fila Motor de IA abre su pantalla y muestra el proveedor activo', async () => {
    const { navigationRef } = await renderSettings();
    await fireEvent.press(await screen.findByRole('button', { name: `${es.settings.aiEngine}. ${es.settings.aiEngineValue}` }));
    await waitFor(() => expect(navigationRef.current?.getCurrentRoute()?.name).toBe('AIEngine'));
  });

  it('muestra el correo, permite abrir Cuenta y cerrar sesión', async () => {
    const { navigationRef } = await renderSettings();
    expect(await screen.findByText(es.settings.signedInAs('ana@correo.com'))).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: es.settings.signOut }));
    await waitFor(() => expect(mockC.auth.signOut).toHaveBeenCalledTimes(1));
    await fireEvent.press(screen.getByRole('button', { name: es.settings.accountRow }));
    await waitFor(() => expect(navigationRef.current?.getCurrentRoute()?.name).toBe('Account'));
  });

  it('en desarrollo ofrece el catálogo de componentes', async () => {
    const { navigationRef } = await renderSettings();
    await fireEvent.press(await screen.findByRole('button', { name: es.settings.catalog }));
    await waitFor(() => expect(navigationRef.current?.getCurrentRoute()?.name).toBe('DevCatalog'));
  });

  it('en release no hay catálogo', async () => {
    const g = globalThis as unknown as { __DEV__: boolean };
    g.__DEV__ = false;
    try {
      await renderSettings();
      await screen.findByRole('header', { name: es.settings.account });
      expect(screen.queryByRole('button', { name: es.settings.catalog })).toBeNull();
    } finally {
      g.__DEV__ = true;
    }
  });
});

describe('Ajustes: nada inventado', () => {
  it('no hay binaurales, karaoke ni voces "persona"', async () => {
    await renderSettings();
    await screen.findByText(es.settings.voice);
    for (const word of [/binaural/i, /karaoke/i, /fatiga/i, /cuenta regresiva/i, /modo zen/i]) {
      expect(screen.queryByText(word)).toBeNull();
    }
  });
});
