import { useEffect, useState } from 'react';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';

import { getContainer } from '../../data/container';

// Conectado = interfaz de red activa y, si se sabe, internet alcanzable.
export function isOnlineState(state: Pick<NetInfoState, 'isConnected' | 'isInternetReachable'>): boolean {
  return state.isConnected === true && state.isInternetReachable !== false;
}

let lastKnown = true; // optimista hasta la primera lectura

export function getIsOnline(): boolean {
  return lastKnown;
}

export async function refreshIsOnline(): Promise<boolean> {
  lastKnown = isOnlineState(await NetInfo.fetch());
  return lastKnown;
}

// Suscripción con rebote: avisa solo cuando cambia el estado.
export function subscribeOnline(cb: (online: boolean) => void): () => void {
  return NetInfo.addEventListener((state) => {
    const online = isOnlineState(state);
    if (online !== lastKnown) {
      lastKnown = online;
      cb(online);
    }
  });
}

export function useIsOnline(): boolean {
  const [online, setOnline] = useState(lastKnown);
  useEffect(() => {
    let active = true;
    refreshIsOnline().then((v) => active && setOnline(v));
    const off = NetInfo.addEventListener((state) => {
      const v = isOnlineState(state);
      lastKnown = v;
      if (active) setOnline(v);
    });
    return () => {
      active = false;
      off();
    };
  }, []);
  return online;
}

// Las acciones que necesitan servidor solo se bloquean en modo live: en mock todo es local.
export function useNetworkGate(): { online: boolean; blocked: boolean } {
  const online = useIsOnline();
  return { online, blocked: getContainer().mode === 'live' && !online };
}
