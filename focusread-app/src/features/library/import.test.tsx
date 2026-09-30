import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { AppError } from '../../lib/errors';
import { es } from '../../i18n/es';
import { useSettingsStore } from '../../state/settingsStore';
import { createTestContainer, renderScreen, type TestContainer } from '../../test/testContainer';
import { ImportScreen } from './ImportScreen';

let mockC: TestContainer;
jest.mock('../../data/container', () => ({ getContainer: () => mockC }));

const LONG_TEXT = `${'La lectura en dosis cortas ayuda a sostener la atención durante más tiempo. '.repeat(12)}`.trim();
const renderImport = () => renderScreen('Import', ImportScreen);
const submit = () => screen.getByRole('button', { name: /^(Crear dosis|Procesando…)$/ });

beforeEach(async () => {
  jest.clearAllMocks();
  mockC = await createTestContainer();
  useSettingsStore.setState({ aiProvider: 'focusread', aiModel: null, targetDoseMinutes: 2.5, hapticsEnabled: false });
});

describe('Importar', () => {
  it('muestra el proveedor activo y el selector de duración con la duración por defecto', async () => {
    useSettingsStore.setState({ targetDoseMinutes: 3.5 });
    await renderImport();
    expect(await screen.findByText('Motor de IA: FocusRead (incluido)')).toBeTruthy();
    expect(screen.getByRole('button', { name: '3.5 min' }).props.accessibilityState).toMatchObject({ selected: true });
    expect(screen.getByRole('button', { name: 'Texto' }).props.accessibilityState).toMatchObject({ selected: true });
  });

  it('bloquea el envío con texto corto y lo habilita desde 300 caracteres', async () => {
    await renderImport();
    await fireEvent.changeText(await screen.findByLabelText('Texto a importar'), 'muy corto');
    expect(submit().props.accessibilityState).toMatchObject({ disabled: true });
    await fireEvent.changeText(screen.getByLabelText('Texto a importar'), LONG_TEXT);
    expect(submit().props.accessibilityState).toMatchObject({ disabled: false });
  });

  it('crea el artículo a través del gateway (nunca inserta directo), lo guarda y cierra la hoja', async () => {
    const process = jest.spyOn(mockC.ai, 'process');
    const insert = jest.spyOn(mockC.localArticles, 'save');
    await renderImport();
    await fireEvent.changeText(await screen.findByLabelText('Texto a importar'), LONG_TEXT);
    await fireEvent.press(screen.getByRole('button', { name: '1.5 min' }));
    await fireEvent.press(submit());

    await waitFor(() => expect(process).toHaveBeenCalledTimes(1));
    expect(process.mock.calls[0][0]).toMatchObject({
      source: { type: 'text', text: LONG_TEXT },
      targetDoseMinutes: 1.5,
      provider: 'focusread',
      includeQuiz: true,
    });
    expect(process.mock.calls[0][1]).toBeUndefined(); // sin key para el proveedor incluido
    expect(await screen.findByText('pantalla:Home')).toBeTruthy(); // hoja cerrada
    const articles = await mockC.articles.list();
    expect(articles).toHaveLength(1);
    expect(articles[0].sourceType).toBe('text');
    expect(insert).toHaveBeenCalledTimes(1); // solo lo guardó el gateway mock
  });

  it('un enlace se rechaza con el mensaje de servidor requerido y no crea nada', async () => {
    await renderImport();
    await fireEvent.press(await screen.findByRole('button', { name: 'Enlace' }));
    await fireEvent.changeText(screen.getByLabelText('Enlace del artículo'), 'https://ejemplo.com/nota');
    await fireEvent.press(submit());
    expect(await screen.findByText(es.errors.URL_FETCH_FAILED)).toBeTruthy();
    expect(es.errors.URL_FETCH_FAILED).toContain('requiere conexión con el servidor');
    expect(await mockC.articles.list()).toHaveLength(0);
  });

  it('muestra el error traducido (por código) y permite reintentar', async () => {
    const process = jest.spyOn(mockC.ai, 'process').mockRejectedValueOnce(new AppError('QUOTA_EXCEEDED', 'raw', { retryAfterSeconds: 3600 }));
    await renderImport();
    await fireEvent.changeText(await screen.findByLabelText('Texto a importar'), LONG_TEXT);
    await fireEvent.press(submit());
    expect(await screen.findByText(/límite diario de FocusRead/)).toBeTruthy();
    expect(screen.getByText(/60 min/)).toBeTruthy();
    expect(screen.queryByText(/raw/)).toBeNull();

    process.mockRestore();
    await fireEvent.press(submit());
    expect(await screen.findByText('pantalla:Home')).toBeTruthy();
  });

  it('con AI_ENRICHMENT_DEGRADED guarda el artículo y avisa antes de cerrar', async () => {
    const original = mockC.ai.process.bind(mockC.ai);
    jest.spyOn(mockC.ai, 'process').mockImplementation(async (req, key) => ({ ...(await original(req, key)), warnings: ['AI_ENRICHMENT_DEGRADED' as const] }));
    await renderImport();
    await fireEvent.changeText(await screen.findByLabelText('Texto a importar'), LONG_TEXT);
    await fireEvent.press(submit());

    expect(await screen.findByText(es.importSheet.degraded)).toBeTruthy();
    expect(screen.getByText(es.importSheet.created)).toBeTruthy();
    expect(await mockC.articles.list()).toHaveLength(1);
    await fireEvent.press(screen.getByRole('button', { name: es.importSheet.done }));
    expect(await screen.findByText('pantalla:Home')).toBeTruthy();
  });

  it('con un proveedor de key propia usa la key guardada y la envía solo como argumento de key', async () => {
    await mockC.secrets.setAIKey('openai', 'sk-prueba-123');
    useSettingsStore.setState({ aiProvider: 'openai', aiModel: 'default' });
    const process = jest.spyOn(mockC.ai, 'process').mockRejectedValue(new AppError('PROVIDER_UNAVAILABLE', 'x'));
    await renderImport();
    await fireEvent.changeText(await screen.findByLabelText('Texto a importar'), LONG_TEXT);
    await fireEvent.press(submit());
    await waitFor(() => expect(process).toHaveBeenCalled());
    const [request, key] = process.mock.calls[0];
    expect(key).toBe('sk-prueba-123');
    expect(request).toMatchObject({ provider: 'openai', model: 'default' });
    expect(JSON.stringify(request)).not.toContain('sk-prueba-123'); // la key no viaja en la solicitud
  });

  it('sin hoja abierta: cerrar con el botón Cerrar vuelve atrás', async () => {
    await renderImport();
    await fireEvent.press(await screen.findByRole('button', { name: 'Cerrar' }));
    expect(await screen.findByText('pantalla:Home')).toBeTruthy();
  });
});
