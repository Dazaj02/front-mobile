import React from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { composeOffline } from '../../data/offline/composeOffline';
import { FakeRemote } from '../../test/fakeRemote';
import { makeSession } from '../../test/fixtures';
import { createTestDb, type TestDb } from '../../test/testDb';
import { newQueryClient } from '../../test/testContainer';
import { isOnlineState, refreshIsOnline, subscribeOnline, useIsOnline, useNetworkGate } from '../network';
import { performSignOut, syncBeforeSignOut } from '../session/signOut';
import { useSyncTriggers } from './useSyncTriggers';

const Net = NetInfo as unknown as { __set: (s: object) => void; __reset: () => void };

let db: TestDb;
let remote: FakeRemote;
let online = true;
let mockContainer: Record<string, unknown>;
jest.mock('../../data/container', () => ({ getContainer: () => mockContainer }));
const mockClearUserData = jest.fn(async () => {});
jest.mock('../session/clearLocalData', () => ({ clearUserData: () => mockClearUserData() }));

const getDb = async () => db;

beforeEach(async () => {
  jest.clearAllMocks();
  Net.__reset();
  db = await createTestDb();
  remote = new FakeRemote();
  online = true;
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  await refreshIsOnline();
});
afterEach(() => jest.restoreAllMocks());

describe('servicio de red', () => {
  it('conectado = interfaz activa e internet alcanzable (o desconocido)', () => {
    expect(isOnlineState({ isConnected: true, isInternetReachable: true })).toBe(true);
    expect(isOnlineState({ isConnected: true, isInternetReachable: null })).toBe(true);
    expect(isOnlineState({ isConnected: true, isInternetReachable: false })).toBe(false);
    expect(isOnlineState({ isConnected: false, isInternetReachable: false })).toBe(false);
    expect(isOnlineState({ isConnected: null, isInternetReachable: null })).toBe(false);
  });

  it('subscribeOnline avisa solo de cambios reales', async () => {
    const cb = jest.fn();
    const off = subscribeOnline(cb);
    await act(async () => Net.__set({ isConnected: true })); // sin cambio
    expect(cb).not.toHaveBeenCalled();
    await act(async () => Net.__set({ isConnected: false, isInternetReachable: false }));
    await act(async () => Net.__set({ isConnected: true, isInternetReachable: true }));
    expect(cb.mock.calls.map((c) => c[0])).toEqual([false, true]);
    off();
    await act(async () => Net.__set({ isConnected: false }));
    expect(cb).toHaveBeenCalledTimes(2);
  });

  it('useIsOnline refleja la pérdida y recuperación de la red', async () => {
    const { result } = await renderHook(() => useIsOnline());
    expect(result.current).toBe(true);
    await act(async () => Net.__set({ isConnected: false, isInternetReachable: false }));
    expect(result.current).toBe(false);
    await act(async () => Net.__set({ isConnected: true, isInternetReachable: true }));
    expect(result.current).toBe(true);
  });

  it('useNetworkGate bloquea solo en modo live y sin conexión', async () => {
    mockContainer = { mode: 'live' };
    const live = await renderHook(() => useNetworkGate());
    expect(live.result.current.blocked).toBe(false);
    await act(async () => Net.__set({ isConnected: false, isInternetReachable: false }));
    expect(live.result.current).toEqual({ online: false, blocked: true });

    mockContainer = { mode: 'mock' };
    const mock = await renderHook(() => useNetworkGate());
    expect(mock.result.current).toEqual({ online: false, blocked: false }); // en mock todo es local
  });
});

describe('useSyncTriggers', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={newQueryClient()}>{children}</QueryClientProvider>;

  async function liveContainer() {
    const offline = composeOffline(getDb, remote.adapters(), () => online);
    mockContainer = { mode: 'live', sync: offline.sync, settingsSync: offline.settings, outbox: offline.outbox };
    return offline;
  }

  it('sincroniza al abrir, al volver al primer plano y al reconectar', async () => {
    const offline = await liveContainer();
    const flush = jest.spyOn(offline.sync, 'flush');
    let onAppState: ((s: string) => void) | undefined;
    jest.spyOn(AppState, 'addEventListener').mockImplementation(((_e: string, cb: (s: string) => void) => {
      onAppState = cb;
      return { remove: jest.fn() };
    }) as never);

    await renderHook(() => useSyncTriggers(), { wrapper });
    await waitFor(() => expect(flush).toHaveBeenCalledTimes(1)); // al abrir

    await act(async () => onAppState?.('background'));
    expect(flush).toHaveBeenCalledTimes(1);
    await act(async () => onAppState?.('active'));
    await waitFor(() => expect(flush).toHaveBeenCalledTimes(2)); // primer plano

    await act(async () => Net.__set({ isConnected: false, isInternetReachable: false }));
    await act(async () => Net.__set({ isConnected: true, isInternetReachable: true }));
    await waitFor(() => expect(flush).toHaveBeenCalledTimes(3)); // reconexión
  });

  it('al reconectar envía lo que quedó en la outbox', async () => {
    const offline = await liveContainer();
    online = false;
    remote.online = false;
    await Net.__set({ isConnected: false, isInternetReachable: false });
    await refreshIsOnline();
    for (let i = 0; i < 3; i++) await offline.outbox.enqueue(makeSession());

    await renderHook(() => useSyncTriggers(), { wrapper });
    expect(remote.sessions.size).toBe(0);

    online = true;
    remote.online = true;
    await act(async () => Net.__set({ isConnected: true, isInternetReachable: true }));
    await waitFor(() => expect(remote.sessions.size).toBe(3));
    expect(await offline.outbox.count()).toBe(0);
  });

  it('se desuscribe al desmontar', async () => {
    const offline = await liveContainer();
    const flush = jest.spyOn(offline.sync, 'flush');
    const remove = jest.fn();
    jest.spyOn(AppState, 'addEventListener').mockImplementation((() => ({ remove })) as never);
    const { unmount } = await renderHook(() => useSyncTriggers(), { wrapper });
    await waitFor(() => expect(flush).toHaveBeenCalled());
    await unmount();
    expect(remove).toHaveBeenCalled();
    flush.mockClear();
    await act(async () => Net.__set({ isConnected: false, isInternetReachable: false }));
    await act(async () => Net.__set({ isConnected: true, isInternetReachable: true }));
    expect(flush).not.toHaveBeenCalled();
  });

  it('en modo mock (sin servidor) no hace nada', async () => {
    mockContainer = { mode: 'mock' };
    const add = jest.spyOn(AppState, 'addEventListener');
    await renderHook(() => useSyncTriggers(), { wrapper });
    expect(add).not.toHaveBeenCalled();
  });
});

describe('cerrar sesión', () => {
  it('live: intenta enviar todo antes de salir y dice cuántas quedaron pendientes', async () => {
    const offline = composeOffline(getDb, remote.adapters(), () => online);
    mockContainer = { mode: 'live', sync: offline.sync, outbox: offline.outbox, auth: { signOut: jest.fn() } };
    await offline.outbox.enqueue(makeSession());
    await offline.outbox.enqueue(makeSession());
    expect(await syncBeforeSignOut()).toEqual({ pending: 0 });
    expect(remote.sessions.size).toBe(2);

    remote.online = false;
    await offline.outbox.enqueue(makeSession());
    expect(await syncBeforeSignOut()).toEqual({ pending: 1 });
  });

  it('mock: no hay nada que sincronizar', async () => {
    mockContainer = { mode: 'mock' };
    expect(await syncBeforeSignOut()).toEqual({ pending: 0 });
  });

  it('live: tras cerrar la sesión se limpian caché, outbox y keys', async () => {
    const signOut = jest.fn(async () => {});
    mockContainer = { mode: 'live', auth: { signOut } };
    await performSignOut();
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(mockClearUserData).toHaveBeenCalledTimes(1);
  });

  it('mock: cerrar sesión CONSERVA los datos (no hay otra copia del progreso)', async () => {
    const signOut = jest.fn(async () => {});
    mockContainer = { mode: 'mock', auth: { signOut } };
    await performSignOut();
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(mockClearUserData).not.toHaveBeenCalled();
  });
});
