import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { File, Paths } from 'expo-file-system';

import { logger } from '../../lib/logger';
import type { AudioPlayerPort } from './cloud';

// Reproductor real: escribe el audio en la caché del dispositivo y lo reproduce con expo-audio.
// Se borra el archivo al terminar o al detenerse.
export class ExpoAudioPlayer implements AudioPlayerPort {
  private player: AudioPlayer | null = null;
  private file: File | null = null;
  private finish: (() => void) | null = null;
  private counter = 0;

  play(bytes: Uint8Array): Promise<void> {
    this.stop();
    return new Promise<void>((resolve, reject) => {
      try {
        const file = new File(Paths.cache, `focusread-tts-${Date.now()}-${this.counter++}.mp3`);
        file.create({ overwrite: true });
        file.write(bytes);
        const player = createAudioPlayer(file.uri);
        this.file = file;
        this.player = player;
        this.finish = resolve;
        player.addListener('playbackStatusUpdate', (status) => {
          if (status.didJustFinish) this.release(true);
        });
        player.play();
      } catch (e) {
        this.release(false);
        reject(e);
      }
    });
  }

  stop(): void {
    this.release(true);
  }

  private release(resolve: boolean): void {
    const finish = this.finish;
    this.finish = null;
    try {
      this.player?.remove();
    } catch (e) {
      logger.warn('No se pudo liberar el reproductor', e);
    }
    try {
      this.file?.delete();
    } catch {
      // el archivo ya no existe
    }
    this.player = null;
    this.file = null;
    if (resolve) finish?.();
  }
}
