import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePreventScreenCapture } from 'expo-screen-capture';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { DEFAULT_SETTINGS } from '../../domain/defaults';
import { AppError } from '../../lib/errors';
import { es } from '../../i18n/es';
import { useSettingsStore } from '../../state/settingsStore';
import { createTestContainer, renderScreen, type TestContainer } from '../../test/testContainer';
import { AIEngineScreen } from './AIEngineScreen';

let mockC: TestContainer;
jest.mock('../../data/container', () => ({ getContainer: () => mockC }));

const KEY = 'sk-clave-secreta-XYZ-987';
const renderEngine = () => renderScreen('AIEngine', AIEngineScreen);

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  mockC = await createTestContainer();
  useSettingsStore.setState({ ...DEFAULT_SETTINGS, hydrated: true });
});

describe('Ajustes › Motor de IA', () => {
  it('impide capturas y grabaciones de pantalla', async () => {
    await renderEngine();
    await screen.findByText('Proveedor');
    expect(usePreventScreenCapture).toHaveBeenCalled();
  });

  it('lista los proveedores y por defecto usa FocusRead sin pedir key', async () => {
    await renderEngine();
    expect(await screen.findByRole('button', { name: 'FocusRead (incluido)' })).toBeTruthy();
    for (const name of ['DeepSeek', 'OpenAI', 'Google Gemini', 'OpenRouter', 'Groq']) {
      expect(screen.getByRole('button', { name })).toBeTruthy();
    }
    expect(screen.queryByLabelText('Tu API key')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Probar conexión' })).toBeNull();
  });

  it('elegir un proveedor con key propia guarda la selección y muestra el formulario enmascarado', async () => {
    await renderEngine();
    await fireEvent.press(await screen.findByRole('button', { name: 'OpenAI' }));
    expect(useSettingsStore.getState()).toMatchObject({ aiProvider: 'openai', aiModel: 'default' });
    await waitFor(async () => expect(await mockC.settings.get()).toMatchObject({ aiProvider: 'openai', aiModel: 'default' }));
    expect((await screen.findByLabelText('Tu API key')).props.secureTextEntry).toBe(true);
  });

  it('la key se guarda SOLO en el almacén seguro: no aparece en SQLite, AsyncStorage ni en los ajustes', async () => {
    await renderEngine();
    await fireEvent.press(await screen.findByRole('button', { name: 'OpenAI' }));
    await fireEvent.changeText(await screen.findByLabelText('Tu API key'), `  ${KEY} `);
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar key' }));

    expect(await screen.findByText(es.aiEngine.keySaved)).toBeTruthy();
    expect(await mockC.secrets.getAIKey('openai')).toBe(KEY); // recortada
    expect(screen.getByLabelText('Tu API key').props.value).toBe(''); // el campo se vacía
    expect(mockC.db.dumpAsText()).not.toContain(KEY);
    expect(JSON.stringify(await mockC.settings.get())).not.toContain(KEY);
    expect(JSON.stringify(useSettingsStore.getState())).not.toContain(KEY);
    const keys = await AsyncStorage.getAllKeys();
    expect(JSON.stringify(await AsyncStorage.multiGet(keys))).not.toContain(KEY);
  });

  it('no guarda una key vacía', async () => {
    await renderEngine();
    await fireEvent.press(await screen.findByRole('button', { name: 'Groq' }));
    await screen.findByLabelText('Tu API key');
    expect(screen.getByRole('button', { name: 'Guardar key' }).props.accessibilityState).toMatchObject({ disabled: true });
  });

  it('permite borrar la key guardada', async () => {
    await mockC.secrets.setAIKey('groq', KEY);
    useSettingsStore.setState({ aiProvider: 'groq', aiModel: 'default' });
    await renderEngine();
    await fireEvent.press(await screen.findByRole('button', { name: 'Borrar key' }));
    expect(await screen.findByText(es.aiEngine.keyDeleted)).toBeTruthy();
    expect(await mockC.secrets.getAIKey('groq')).toBeNull();
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Borrar key' })).toBeNull());
  });

  it('en modo mock "Probar conexión" dice "Disponible con el servidor"', async () => {
    await mockC.secrets.setAIKey('openai', KEY);
    useSettingsStore.setState({ aiProvider: 'openai', aiModel: 'default' });
    await renderEngine();
    expect(await screen.findByText(es.aiEngine.testServerOnly)).toBeTruthy();
    expect((await screen.findByRole('button', { name: 'Probar conexión' })).props.accessibilityState).toMatchObject({ disabled: true });
  });

  it('en modo live prueba la conexión con la key guardada y traduce los errores', async () => {
    mockC.mode = 'live';
    await mockC.secrets.setAIKey('openai', KEY);
    useSettingsStore.setState({ aiProvider: 'openai', aiModel: 'default' });
    const testProvider = jest.spyOn(mockC.ai, 'testProvider').mockResolvedValueOnce();
    jest.spyOn(mockC.ai, 'usage').mockResolvedValue({ used: 0, limit: 0, resetsAt: '2026-10-01T00:00:00.000Z' });
    await renderEngine();
    await fireEvent.press(await screen.findByRole('button', { name: 'Probar conexión' }));
    expect(await screen.findByText(es.aiEngine.testOk)).toBeTruthy();
    expect(testProvider).toHaveBeenCalledWith('openai', 'default', KEY);

    testProvider.mockRejectedValueOnce(new AppError('PROVIDER_KEY_INVALID', 'raw'));
    await fireEvent.press(screen.getByRole('button', { name: 'Probar conexión' }));
    expect(await screen.findByText(es.errors.PROVIDER_KEY_INVALID)).toBeTruthy();
  });

  it('en modo live con FocusRead muestra el uso diario', async () => {
    mockC.mode = 'live';
    jest.spyOn(mockC.ai, 'usage').mockResolvedValue({ used: 7, limit: 20, resetsAt: '2026-10-01T00:00:00.000Z' });
    await renderEngine();
    expect(await screen.findByText(es.aiEngine.usage(7, 20))).toBeTruthy();
  });

  it('si no cargan los proveedores muestra el error con reintento', async () => {
    jest.spyOn(mockC.ai, 'listProviders').mockRejectedValueOnce(new Error('sin red'));
    await renderEngine();
    expect(await screen.findByText(es.aiEngine.loadFailed)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('button', { name: 'OpenAI' })).toBeTruthy();
  });
});
