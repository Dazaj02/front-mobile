import type { CloudTtsGateway } from '../../data/api/HttpTtsGateway';
import { createCloudSpeaker } from './cloud';
import { ExpoAudioPlayer } from './expoAudioPlayer';
import { registerCloudSpeaker } from './index';

// Activa las voces en la nube con el gateway dado. Lo llama el contenedor live (F8) cuando hay sesión.
export function enableCloudTts(gateway: CloudTtsGateway): void {
  registerCloudSpeaker(createCloudSpeaker({ gateway, player: new ExpoAudioPlayer() }));
}

export function disableCloudTts(): void {
  registerCloudSpeaker(null);
}
