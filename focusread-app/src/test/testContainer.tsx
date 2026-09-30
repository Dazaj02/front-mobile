import React from 'react';
import { Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render } from '@testing-library/react-native';

import type { Container } from '../data/container';
import { LocalArticleRepository } from '../data/local/LocalArticleRepository';
import { LocalProgressRepository } from '../data/local/LocalProgressRepository';
import { Outbox } from '../data/local/outbox';
import { LocalSettingsRepository } from '../data/local/settingsCache';
import { LocalChunkerGateway } from '../data/mock/LocalChunkerGateway';
import type { AuthRepository, ByokProviderId, SecretStore } from '../domain/ports';
import { TestProviders } from '../design-system/testUtils';
import { createTestDb, type TestDb } from './testDb';

export class FakeSecretStore implements SecretStore {
  readonly keys = new Map<string, string>();
  async getAIKey(p: ByokProviderId) {
    return this.keys.get(p) ?? null;
  }
  async setAIKey(p: ByokProviderId, key: string) {
    if (!key.trim()) throw new Error('vacía');
    this.keys.set(p, key.trim());
  }
  async deleteAIKey(p: ByokProviderId) {
    this.keys.delete(p);
  }
  async clearAll() {
    this.keys.clear();
  }
}

export function fakeAuth(overrides: Partial<AuthRepository> = {}): AuthRepository {
  return {
    getSession: jest.fn(async () => ({ userId: 'u1', email: 'ana@correo.com' })),
    onAuthChange: jest.fn(() => () => {}),
    signUp: jest.fn(async () => ({ needsEmailVerification: true })),
    resendVerification: jest.fn(async () => {}),
    signIn: jest.fn(async () => ({ userId: 'u1', email: 'ana@correo.com' })),
    signOut: jest.fn(async () => {}),
    requestPasswordReset: jest.fn(async () => {}),
    updatePassword: jest.fn(async () => {}),
    handleAuthCallback: jest.fn(async () => 'unknown' as const),
    deleteAccount: jest.fn(async () => {}),
    ...overrides,
  };
}

export interface TestContainer extends Container {
  db: TestDb;
  secrets: FakeSecretStore;
}

// Contenedor real (repositorios sobre SQLite en memoria) con autenticación y secretos simulados.
export async function createTestContainer(overrides: Partial<Container> = {}): Promise<TestContainer> {
  const db = await createTestDb();
  const getDb = async () => db;
  const localArticles = new LocalArticleRepository(getDb);
  return {
    mode: 'mock',
    auth: fakeAuth(),
    articles: localArticles,
    localArticles,
    progress: new LocalProgressRepository(getDb),
    settings: new LocalSettingsRepository(getDb),
    ai: new LocalChunkerGateway({ articles: localArticles }),
    secrets: new FakeSecretStore(),
    outbox: new Outbox(getDb),
    db,
    ...overrides,
  } as TestContainer;
}

export function newQueryClient() {
  // gcTime infinito: React Query no deja temporizadores abiertos al terminar cada prueba.
  return new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false, gcTime: Infinity } } });
}

type ScreenComponent = React.ComponentType<any>;

// Monta una pantalla dentro de NavigationContainer + React Query + tema. `extraScreens` permite
// comprobar navegaciones (cada una se renderiza con su nombre como texto).
export async function renderScreen(
  name: string,
  Screen: ScreenComponent,
  options: { params?: object; extraScreens?: string[]; queryClient?: QueryClient } = {},
) {
  const Stack = createNativeStackNavigator<Record<string, object | undefined>>();
  const qc = options.queryClient ?? newQueryClient();
  const navigationRef = React.createRef<import('@react-navigation/native').NavigationContainerRef<Record<string, object | undefined>>>();
  const utils = await render(
    <TestProviders>
      <QueryClientProvider client={qc}>
        <NavigationContainer ref={navigationRef}>
          <Stack.Navigator initialRouteName="Home" screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Home">{() => <Text>pantalla:Home</Text>}</Stack.Screen>
            <Stack.Screen name={name} component={Screen} />
            {(options.extraScreens ?? []).map((extra) => (
              <Stack.Screen key={extra} name={extra}>
                {() => <Text>{`pantalla:${extra}`}</Text>}
              </Stack.Screen>
            ))}
          </Stack.Navigator>
        </NavigationContainer>
      </QueryClientProvider>
    </TestProviders>,
  );
  // La pantalla se apila sobre "Home": goBack() devuelve a "pantalla:Home".
  await act(async () => navigationRef.current?.navigate(name, options.params));
  return { ...utils, qc, navigationRef };
}
