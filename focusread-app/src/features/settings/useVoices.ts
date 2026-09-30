import { useQuery } from '@tanstack/react-query';

import { getContainer } from '../../data/container';
import { loadSpanishVoices } from '../../services/tts';

// Voces reales del sistema en español. loadSpanishVoices reintenta si llegan vacías al iniciar el motor TTS.
export function useSpanishVoices() {
  return useQuery({ queryKey: ['voices'], queryFn: () => loadSpanishVoices(), staleTime: Infinity, retry: false });
}

// Voces de alta calidad del servidor (propuesta temporal). Solo existen en modo live con backend.
export function useCloudVoices() {
  const gateway = getContainer().tts;
  return useQuery({
    queryKey: ['cloudVoices'],
    queryFn: () => (gateway as NonNullable<typeof gateway>).listVoices(),
    enabled: Boolean(gateway),
    retry: false,
    staleTime: 10 * 60_000,
  });
}
