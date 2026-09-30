import { Alert } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { buildDemoArticles } from '../data/mock/demoArticles';
import { DEFAULT_SETTINGS } from '../domain/defaults';
import { es } from '../i18n/es';
import { useSessionStore } from '../state/sessionStore';
import { useSettingsStore } from '../state/settingsStore';
import { makeSession } from '../test/fixtures';
import { createTestContainer, renderScreen, type TestContainer } from '../test/testContainer';
import { refreshIsOnline } from '../services/network';
import { AccountScreen } from './settings/AccountScreen';
import { AIEngineScreen } from './settings/AIEngineScreen';
import { SettingsScreen } from './settings/SettingsScreen';
import { ImportScreen } from './library/ImportScreen';
import { LibraryScreen } from './library/LibraryScreen';
import { recordReadingSession } from './reader/recordReadingSession';

const Net = NetInfo as unknown as { __set: (s: object) => void; __reset: () => void };
let mockC: TestContainer;
jest.mock('../data/container', () => ({ getContainer: () => mockC }));
const mockClearUserData = jest.fn(async () => {});
jest.mock('../services/session/clearLocalData', () => ({ clearUserData: () => mockClearUserData() }));
jest.mock('../services/tts', () => ({ loadSpanishVoices: jest.fn(async () => []), speak: jest.fn(), stop: jest.fn() }));

const goOffline = async () => {
  await act(async () => Net.__set({ isConnected: false, isInternetReachable: false }));
  await refreshIsOnline();
};

beforeEach(async () => {
  jest.clearAllMocks();
  Net.__reset();
  await refreshIsOnline();
  mockC = await createTestContainer();
  useSettingsStore.setState({ ...DEFAULT_SETTINGS, hydrated: true, hapticsEnabled: false });
  useSessionStore.setState({ status: 'signedIn', session: { userId: 'u', email: 'ana@correo.com' } });
});

async function seed() {
  for (const a of buildDemoArticles(2.5)) await mockC.localArticles.save(a);
}

describe('banner "Sin conexión"', () => {
  it('aparece cuando se pierde la red y desaparece al recuperarla (en todas las pantallas con AppScreen)', async () => {
    await seed();
    await renderScreen('Library', LibraryScreen);
    await screen.findByRole('header', { name: es.library.title });
    expect(screen.queryByText(es.offline.banner)).toBeNull();

    await act(async () => Net.__set({ isConnected: false, isInternetReachable: false }));
    expect(await screen.findByText(es.offline.banner)).toBeTruthy();

    await act(async () => Net.__set({ isConnected: true, isInternetReachable: true }));
    await waitFor(() => expect(screen.queryByText(es.offline.banner)).toBeNull());
  });

  it('también en Ajustes', async () => {
    await goOffline();
    await renderScreen('Settings', SettingsScreen);
    expect(await screen.findByText(es.offline.banner)).toBeTruthy();
  });
});

describe('acciones que requieren conexión (modo live sin red)', () => {
  beforeEach(() => {
    mockC.mode = 'live';
  });

  it('favorito deshabilitado', async () => {
    await seed();
    await goOffline();
    await renderScreen('Library', LibraryScreen);
    const buttons = await screen.findAllByRole('button', { name: 'Guardar artículo' });
    expect(buttons.length).toBe(3);
    for (const b of buttons) expect(b.props.accessibilityState).toMatchObject({ disabled: true });
  });

  it('importar bloqueado con mensaje', async () => {
    await goOffline();
    await renderScreen('Import', ImportScreen);
    await fireEvent.changeText(await screen.findByLabelText('Texto a importar'), 'x'.repeat(400));
    expect(screen.getByText(es.offline.importRequires)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Crear dosis' }).props.accessibilityState).toMatchObject({ disabled: true });
  });

  it('probar la key deshabilitado con mensaje', async () => {
    await mockC.secrets.setAIKey('openai', 'sk-x');
    useSettingsStore.setState({ aiProvider: 'openai', aiModel: 'default' });
    await goOffline();
    await renderScreen('AIEngine', AIEngineScreen);
    expect(await screen.findByText(es.offline.testRequires)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Probar conexión' }).props.accessibilityState).toMatchObject({ disabled: true });
  });

  it('eliminar cuenta deshabilitado con mensaje aunque se escriba ELIMINAR', async () => {
    await goOffline();
    await renderScreen('Account', AccountScreen);
    await fireEvent.press(await screen.findByRole('button', { name: es.account.deleteStart }));
    await fireEvent.changeText(screen.getByLabelText(es.account.deleteConfirmLabel), 'ELIMINAR');
    expect(screen.getByText(es.offline.deleteRequires)).toBeTruthy();
    expect(screen.getByRole('button', { name: es.account.deleteConfirm }).props.accessibilityState).toMatchObject({ disabled: true });
  });

  it('al recuperar la conexión todo vuelve a habilitarse', async () => {
    await seed();
    await goOffline();
    await renderScreen('Library', LibraryScreen);
    await screen.findAllByRole('button', { name: 'Guardar artículo' });
    await act(async () => Net.__set({ isConnected: true, isInternetReachable: true }));
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Guardar artículo' })[0].props.accessibilityState).toMatchObject({ disabled: false }));
  });
});

describe('modo mock sin red: todo es local y sigue funcionando', () => {
  it('el favorito y la importación NO se bloquean', async () => {
    await seed();
    await goOffline();
    const { unmount } = await renderScreen('Library', LibraryScreen);
    const [bookmark] = await screen.findAllByRole('button', { name: 'Guardar artículo' });
    expect(bookmark.props.accessibilityState).toMatchObject({ disabled: false });
    await unmount();

    await renderScreen('Import', ImportScreen);
    await fireEvent.changeText(await screen.findByLabelText('Texto a importar'), 'x'.repeat(400));
    expect(screen.getByRole('button', { name: 'Crear dosis' }).props.accessibilityState).toMatchObject({ disabled: false });
  });
});

describe('guardado de sesiones de lectura', () => {
  it('live: primero a la outbox y luego intenta enviar (nunca directo al remoto)', async () => {
    const flush = jest.fn(async () => ({ sent: 0, failed: 0, remaining: 1, skipped: false }));
    mockC.mode = 'live';
    mockC.sync = { flush } as never;
    const direct = jest.spyOn(mockC.progress, 'recordSession');
    const session = makeSession();
    await recordReadingSession(session);
    expect((await mockC.outbox.all()).map((e) => e.session.id)).toEqual([session.id]);
    expect(flush).toHaveBeenCalledTimes(1);
    expect(direct).not.toHaveBeenCalled();
  });

  it('live sin conexión: la sesión queda guardada en la outbox aunque el envío falle', async () => {
    mockC.sync = { flush: jest.fn(async () => ({ sent: 0, failed: 0, remaining: 1, skipped: true })) } as never;
    await recordReadingSession(makeSession());
    expect(await mockC.outbox.count()).toBe(1);
  });

  it('mock: se guarda directo en la base local (sin outbox)', async () => {
    await recordReadingSession(makeSession());
    expect(await mockC.outbox.count()).toBe(0);
    expect(await mockC.progress.listSessions('2000-01-01T00:00:00.000Z')).toHaveLength(1);
  });
});

describe('Ajustes › cerrar sesión', () => {
  const tapSignOut = async () => fireEvent.press(await screen.findByRole('button', { name: es.settings.signOut }));

  it('mock: cierra sesión y conserva los datos', async () => {
    await seed();
    await renderScreen('Settings', SettingsScreen);
    await tapSignOut();
    await waitFor(() => expect(mockC.auth.signOut).toHaveBeenCalledTimes(1));
    expect(mockClearUserData).not.toHaveBeenCalled();
    expect(await mockC.articles.list()).toHaveLength(3);
  });

  it('live sin pendientes: envía, cierra y limpia la caché', async () => {
    mockC.mode = 'live';
    const flush = jest.fn(async () => ({ sent: 0, failed: 0, remaining: 0, skipped: false }));
    mockC.sync = { flush } as never;
    const alert = jest.spyOn(Alert, 'alert');
    await renderScreen('Settings', SettingsScreen);
    await tapSignOut();
    await waitFor(() => expect(mockC.auth.signOut).toHaveBeenCalledTimes(1));
    expect(flush).toHaveBeenCalledWith({ ignoreBackoff: true });
    expect(mockClearUserData).toHaveBeenCalledTimes(1);
    expect(alert).not.toHaveBeenCalled();
  });

  it('live con sesiones sin sincronizar: advierte y no cierra hasta confirmar', async () => {
    mockC.mode = 'live';
    mockC.sync = { flush: jest.fn(async () => ({ sent: 0, failed: 1, remaining: 2, skipped: false })) } as never;
    await mockC.outbox.enqueue(makeSession());
    await mockC.outbox.enqueue(makeSession());
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await renderScreen('Settings', SettingsScreen);
    await tapSignOut();

    await waitFor(() => expect(alert).toHaveBeenCalledTimes(1));
    const [title, body, buttons] = alert.mock.calls[0];
    expect(title).toBe(es.settings.signOutPendingTitle);
    expect(body).toBe(es.settings.signOutPendingBody(2));
    expect(mockC.auth.signOut).not.toHaveBeenCalled();

    // Cancelar: no pasa nada
    buttons?.find((b) => b.style === 'cancel')?.onPress?.();
    expect(mockC.auth.signOut).not.toHaveBeenCalled();
    expect(mockClearUserData).not.toHaveBeenCalled();

    // "Cerrar sesión de todos modos": ahora sí
    await act(async () => buttons?.find((b) => b.text === es.settings.signOutAnyway)?.onPress?.());
    await waitFor(() => expect(mockC.auth.signOut).toHaveBeenCalledTimes(1));
    expect(mockClearUserData).toHaveBeenCalledTimes(1);
  });
});
