import { create } from 'zustand';

import { speak, stop } from '../services/tts';
import { useSettingsStore } from './settingsStore';

export interface PlayerItem {
  articleId: string;
  title: string;
  doseIndex: number;
  text: string;
}

export interface PlayerState {
  item: PlayerItem | null;
  playing: boolean;
  play: (item: PlayerItem) => void;
  toggle: () => void;
  close: () => void;
}

// Lectura en voz alta con la voz, velocidad y tono de Ajustes. El minireproductor (dock) la controla.
export const usePlayerStore = create<PlayerState>((set, get) => {
  const start = (item: PlayerItem) => {
    const { voiceId, speechRate, speechPitch } = useSettingsStore.getState();
    set({ item, playing: true });
    speak(item.text, {
      voiceId,
      rate: speechRate,
      pitch: speechPitch,
      onDone: () => set({ playing: false }),
      onError: () => set({ playing: false }),
    });
  };

  return {
    item: null,
    playing: false,
    play: start,
    // Android no admite pausar el TTS a mitad: "pausar" detiene y "reanudar" empieza la dosis de nuevo.
    toggle: () => {
      const { item, playing } = get();
      if (!item) return;
      if (playing) {
        stop();
        set({ playing: false });
      } else {
        start(item);
      }
    },
    close: () => {
      stop();
      set({ item: null, playing: false });
    },
  };
});
