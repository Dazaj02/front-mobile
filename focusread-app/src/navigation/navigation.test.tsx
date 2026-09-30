import React from 'react';
import fs from 'fs';
import path from 'path';
import { BackHandler } from 'react-native';
import { getStateFromPath, NavigationContainer, type NavigationContainerRef } from '@react-navigation/native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { TestProviders } from '../design-system/testUtils';
import { es } from '../i18n/es';
import { createSessionStore, useSessionStore } from '../state/sessionStore';
import { linkingConfig } from './linking';
import { RootNavigator } from './RootNavigator';

// Sesión controlada por la prueba
const mockAuth = {
  getSession: jest.fn(),
  onAuthChange: jest.fn(() => () => {}),
  signOut: jest.fn(),
};
let mockDevSignIn: (() => Promise<unknown>) | undefined;
jest.mock('../data/container', () => ({
  getContainer: () => ({ auth: mockAuth, get devSignIn() { return mockDevSignIn; } }),
}));

const press = (BackHandler as unknown as { mockPressBack: () => void }).mockPressBack;
const back = () => act(async () => void press());

async function mountApp(session: { userId: string; email: string } | null) {
  mockAuth.getSession.mockResolvedValue(session);
  const ref = React.createRef<NavigationContainerRef<Record<string, object | undefined>>>();
  await render(
    <TestProviders>
      <NavigationContainer ref={ref}>
        <RootNavigator />
      </NavigationContainer>
    </TestProviders>,
  );
  await act(async () => void (await useSessionStore.getState().init()));
  return ref;
}

beforeEach(() => {
  jest.clearAllMocks();
  useSessionStore.setState({ status: 'loading', session: null });
  mockDevSignIn = undefined;
});

describe('RootNavigator', () => {
  it('sin sesión muestra la bienvenida (AuthStack)', async () => {
    await mountApp(null);
    expect(await screen.findByRole('button', { name: es.auth.goLogin })).toBeTruthy();
    expect(screen.queryByText(es.tabs.library)).toBeNull();
  });

  it('con sesión muestra la app con las 3 pestañas', async () => {
    await mountApp({ userId: 'u', email: 'ana@correo.com' });
    expect(await screen.findByRole('tab', { name: es.tabs.library })).toBeTruthy();
    expect(screen.getByRole('tab', { name: es.tabs.progress })).toBeTruthy();
    expect(screen.getByRole('tab', { name: es.tabs.settings })).toBeTruthy();
    expect(screen.queryByRole('button', { name: es.auth.goLogin })).toBeNull();
  });

  it('solo se monta la pestaña visible', async () => {
    await mountApp({ userId: 'u', email: 'ana@correo.com' });
    expect(await screen.findByText(es.library.emptyTitle)).toBeTruthy();
    expect(screen.queryByText(es.settings.appearance)).toBeNull(); // Ajustes aún no montada

    await fireEvent.press(screen.getByRole('tab', { name: es.tabs.settings }));
    expect(await screen.findByText(es.settings.appearance)).toBeTruthy();
    expect(screen.queryByText(es.library.emptyTitle)).toBeNull(); // Biblioteca desmontada
    expect(screen.getByRole('tab', { name: es.tabs.settings }).props.accessibilityState).toMatchObject({ selected: true });
  });

  it('cerrar sesión devuelve a la bienvenida', async () => {
    mockAuth.signOut.mockImplementation(async () => {
      useSessionStore.setState({ status: 'signedOut', session: null });
    });
    await mountApp({ userId: 'u', email: 'ana@correo.com' });
    await fireEvent.press(await screen.findByRole('tab', { name: es.tabs.settings }));
    await fireEvent.press(await screen.findByRole('button', { name: es.settings.signOut }));
    expect(await screen.findByRole('button', { name: es.auth.goLogin })).toBeTruthy();
  });
});

describe('botón atrás de Android', () => {
  it('orden: pestaña distinta de Biblioteca → Biblioteca → salir de la app', async () => {
    await mountApp({ userId: 'u', email: 'ana@correo.com' });
    await fireEvent.press(await screen.findByRole('tab', { name: es.tabs.progress }));
    expect(await screen.findByText(es.common.comingSoon)).toBeTruthy();

    await back();
    expect(await screen.findByText(es.library.emptyTitle)).toBeTruthy(); // volvió a Biblioteca

    await back();
    expect(BackHandler.exitApp).toHaveBeenCalled(); // desde Biblioteca sale
  });

  it('cierra primero el lector y luego sale', async () => {
    await mountApp({ userId: 'u', email: 'ana@correo.com' });
    await fireEvent.press(await screen.findByRole('button', { name: es.library.devReader }));
    expect(await screen.findByText(es.reader.title)).toBeTruthy();
    await back();
    expect(await screen.findByText(es.library.emptyTitle)).toBeTruthy();
    expect(screen.queryByText(es.reader.title)).toBeNull();
    expect(BackHandler.exitApp).not.toHaveBeenCalled();
  });

  it('cierra primero la hoja de importar, luego el lector, luego la pestaña', async () => {
    const ref = await mountApp({ userId: 'u', email: 'ana@correo.com' });
    await fireEvent.press(await screen.findByRole('button', { name: es.library.devReader }));
    await screen.findByText(es.reader.title);
    await act(async () => ref.current?.navigate('Import'));
    expect(await screen.findByRole('header', { name: es.importSheet.title })).toBeTruthy();

    await back(); // hoja
    expect(screen.queryByRole('header', { name: es.importSheet.title })).toBeNull();
    expect(screen.getByText(es.reader.title)).toBeTruthy(); // el lector sigue

    await back(); // lector
    expect(await screen.findByText(es.library.emptyTitle)).toBeTruthy();
    expect(BackHandler.exitApp).not.toHaveBeenCalled();
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
    mockDevSignIn = undefined;
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
