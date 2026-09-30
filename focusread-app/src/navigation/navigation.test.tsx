import React from 'react';
import fs from 'fs';
import path from 'path';
import { BackHandler } from 'react-native';
import { getStateFromPath, NavigationContainer, type NavigationContainerRef } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { buildDemoArticles } from '../data/mock/demoArticles';
import { TestProviders } from '../design-system/testUtils';
import { es } from '../i18n/es';
import { usePlayerStore } from '../state/playerStore';
import { createSessionStore, useSessionStore } from '../state/sessionStore';
import { useSettingsStore } from '../state/settingsStore';
import { createTestContainer, fakeAuth, newQueryClient, type TestContainer } from '../test/testContainer';
import { linkingConfig } from './linking';
import { RootNavigator } from './RootNavigator';

let mockC: TestContainer;
let mockDevSignIn: (() => Promise<unknown>) | undefined;
jest.mock('../data/container', () => ({
  getContainer: () => ({ ...mockC, devSignIn: mockDevSignIn }),
}));

const press = (BackHandler as unknown as { mockPressBack: () => void }).mockPressBack;
const back = () => act(async () => void press());
const USER = { userId: 'u', email: 'ana@correo.com' };
const HABITS = 'Por qué leer en dosis cortas funciona';

async function mountApp(session: typeof USER | null, options: { seed?: boolean } = {}) {
  mockC.auth = fakeAuth({ getSession: jest.fn(async () => session), onAuthChange: jest.fn(() => () => {}) });
  if (options.seed) for (const a of buildDemoArticles(2.5)) await mockC.localArticles.save(a);
  const ref = React.createRef<NavigationContainerRef<Record<string, object | undefined>>>();
  await render(
    <TestProviders>
      <QueryClientProvider client={newQueryClient()}>
        <NavigationContainer ref={ref}>
          <RootNavigator />
        </NavigationContainer>
      </QueryClientProvider>
    </TestProviders>,
  );
  await act(async () => void (await useSessionStore.getState().init()));
  return ref;
}

const libraryHeader = () => screen.findByRole('header', { name: es.library.title });

beforeEach(async () => {
  jest.clearAllMocks();
  mockC = await createTestContainer();
  mockDevSignIn = undefined;
  useSessionStore.setState({ status: 'loading', session: null });
  usePlayerStore.setState({ item: null, playing: false });
  useSettingsStore.setState({ hapticsEnabled: false });
});

describe('RootNavigator', () => {
  it('sin sesión muestra la bienvenida (AuthStack)', async () => {
    await mountApp(null);
    expect(await screen.findByRole('button', { name: es.auth.goLogin })).toBeTruthy();
    expect(screen.queryByRole('tab', { name: es.tabs.library })).toBeNull();
  });

  it('con sesión muestra la app con las 3 pestañas', async () => {
    await mountApp(USER);
    expect(await screen.findByRole('tab', { name: es.tabs.library })).toBeTruthy();
    expect(screen.getByRole('tab', { name: es.tabs.progress })).toBeTruthy();
    expect(screen.getByRole('tab', { name: es.tabs.settings })).toBeTruthy();
    expect(screen.queryByRole('button', { name: es.auth.goLogin })).toBeNull();
  });

  it('solo se monta la pestaña visible', async () => {
    await mountApp(USER);
    await libraryHeader();
    expect(screen.queryByRole('header', { name: es.settings.appearance })).toBeNull(); // Ajustes aún no montada

    await fireEvent.press(screen.getByRole('tab', { name: es.tabs.settings }));
    expect(await screen.findByRole('header', { name: es.settings.appearance })).toBeTruthy();
    expect(screen.queryByRole('header', { name: es.library.title })).toBeNull(); // Biblioteca desmontada
    expect(screen.getByRole('tab', { name: es.tabs.settings }).props.accessibilityState).toMatchObject({ selected: true });
  });

  it('cerrar sesión devuelve a la bienvenida', async () => {
    await mountApp(USER);
    await fireEvent.press(await screen.findByRole('tab', { name: es.tabs.settings }));
    mockC.auth.signOut = jest.fn(async () => {
      useSessionStore.setState({ status: 'signedOut', session: null });
    });
    await fireEvent.press(await screen.findByRole('button', { name: es.settings.signOut }));
    expect(await screen.findByRole('button', { name: es.auth.goLogin })).toBeTruthy();
  });
});

describe('botón atrás de Android', () => {
  it('orden: pestaña distinta de Biblioteca → Biblioteca → salir de la app', async () => {
    await mountApp(USER);
    await fireEvent.press(await screen.findByRole('tab', { name: es.tabs.progress }));
    expect(await screen.findByRole('header', { name: es.progress.title })).toBeTruthy();

    await back();
    expect(await libraryHeader()).toBeTruthy(); // volvió a Biblioteca

    await back();
    expect(BackHandler.exitApp).toHaveBeenCalled(); // desde Biblioteca sale
  });

  it('cierra primero el lector y luego sale', async () => {
    await mountApp(USER, { seed: true });
    await fireEvent.press(await screen.findByRole('button', { name: new RegExp(`^${HABITS}`) }));
    expect(await screen.findByText(es.library.doseOf(1, 2))).toBeTruthy(); // lector abierto

    await back();
    expect(await libraryHeader()).toBeTruthy();
    expect(screen.queryByText(es.library.doseOf(1, 2))).toBeNull();
    expect(BackHandler.exitApp).not.toHaveBeenCalled();
  });

  it('cierra primero la hoja de importar, luego el lector, luego la pestaña', async () => {
    const ref = await mountApp(USER, { seed: true });
    await fireEvent.press(await screen.findByRole('button', { name: new RegExp(`^${HABITS}`) }));
    await screen.findByText(es.library.doseOf(1, 2));
    await act(async () => ref.current?.navigate('Import'));
    expect(await screen.findByRole('header', { name: es.importSheet.title })).toBeTruthy();

    await back(); // hoja
    expect(screen.queryByRole('header', { name: es.importSheet.title })).toBeNull();
    expect(screen.getByText(es.library.doseOf(1, 2))).toBeTruthy(); // el lector sigue

    await back(); // lector
    expect(await libraryHeader()).toBeTruthy();
    expect(BackHandler.exitApp).not.toHaveBeenCalled();
  });

  it('el botón Importar de Biblioteca abre la hoja y atrás la cierra', async () => {
    await mountApp(USER);
    await fireEvent.press(await screen.findByRole('button', { name: es.library.import }));
    expect(await screen.findByRole('header', { name: es.importSheet.title })).toBeTruthy();
    await back();
    expect(screen.queryByRole('header', { name: es.importSheet.title })).toBeNull();
    expect(await libraryHeader()).toBeTruthy();
  });
});

describe('minireproductor', () => {
  it('aparece sobre la barra de pestañas cuando hay audio y se cierra con su botón', async () => {
    await mountApp(USER);
    await libraryHeader();
    expect(screen.queryByRole('button', { name: 'Cerrar reproductor' })).toBeNull();

    await act(async () => usePlayerStore.getState().play({ articleId: 'a', title: 'Mi artículo', doseIndex: 0, text: 'Hola.' }));
    expect(await screen.findByText('Mi artículo')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Pausar lectura en voz alta' })).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Cerrar reproductor' }));
    expect(screen.queryByText('Mi artículo')).toBeNull();
    expect(usePlayerStore.getState().item).toBeNull();
  });
});

describe('modo demo', () => {
  it('existe solo en desarrollo', async () => {
    mockDevSignIn = jest.fn();
    await mountApp(null);
    expect(await screen.findByRole('button', { name: es.auth.demo })).toBeTruthy();
  });

  it('no existe en release (__DEV__ = false) aunque el contenedor lo ofrezca', async () => {
    const g = globalThis as unknown as { __DEV__: boolean };
    const original = g.__DEV__;
    g.__DEV__ = false;
    try {
      mockDevSignIn = jest.fn();
      await mountApp(null);
      await screen.findByRole('button', { name: es.auth.goLogin });
      expect(screen.queryByRole('button', { name: es.auth.demo })).toBeNull();
    } finally {
      g.__DEV__ = original;
    }
  });

  it('sin devSignIn en el contenedor tampoco aparece', async () => {
    await mountApp(null);
    await screen.findByRole('button', { name: es.auth.goLogin });
    expect(screen.queryByRole('button', { name: es.auth.demo })).toBeNull();
  });
});

describe('deep links', () => {
  const stateFor = (p: string) => getStateFromPath(p, linkingConfig as never);

  it('focusread://auth/callback?code=… abre AuthCallback con el código', () => {
    expect(stateFor('auth/callback?code=abc')?.routes[0]).toMatchObject({ name: 'AuthCallback', params: { code: 'abc' } });
  });

  it('focusread://auth/reset abre la nueva contraseña', () => {
    expect(stateFor('auth/reset')?.routes[0].name).toBe('ResetPassword');
  });

  it('la raíz abre la bienvenida', () => {
    expect(stateFor('')?.routes[0].name).toBe('Welcome');
  });
});

describe('App.tsx', () => {
  it('tiene menos de 60 líneas', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', '..', 'App.tsx'), 'utf8');
    expect(source.split('\n').length).toBeLessThan(60);
  });
});

describe('sessionStore', () => {
  it('refleja la sesión inicial y los cambios de auth', async () => {
    let listener: ((s: { userId: string; email: string } | null) => void) | undefined;
    const auth = {
      getSession: jest.fn().mockResolvedValue(null),
      onAuthChange: jest.fn((cb) => {
        listener = cb;
        return () => {};
      }),
      signOut: jest.fn().mockResolvedValue(undefined),
    };
    const store = createSessionStore(() => auth as never);
    expect(store.getState().status).toBe('loading');
    await store.getState().init();
    expect(store.getState().status).toBe('signedOut');
    listener?.({ userId: 'u', email: 'a@b.co' });
    expect(store.getState()).toMatchObject({ status: 'signedIn', session: { email: 'a@b.co' } });
    await store.getState().signOut();
    expect(auth.signOut).toHaveBeenCalled();
  });
});
