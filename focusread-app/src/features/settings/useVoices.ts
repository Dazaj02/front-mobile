import { useQuery } from '@tanstack/react-query';

import { loadSpanishVoices } from '../../services/tts';

// Voces reales del sistema en español. loadSpanishVoices reintenta si llegan vacías al iniciar el motor TTS.
export function useSpanishVoices() {
  return useQuery({ queryKey: ['voices'], queryFn: () => loadSpanishVoices(), staleTime: Infinity, retry: false });
}
