import * as Speech from 'expo-speech';

import { fromCloudVoiceId, isCloudVoiceId } from '../../domain/ttsProposal';
import type { CloudSpeaker } from './cloud';
import { splitForSpeech } from './split';

export interface VoiceInfo {
  id: string;
  name: string;
  language: string;
}

// Solo voces reales del sistema en español (es, es-MX, es_ES…). Nada de "personas" inventadas.
export function filterSpanishVoices(voices: readonly Speech.Voice[]): VoiceInfo[] {
  return voices
    .filter((v) => /^es([-_]|$)/i.test(v.language))
    .map((v) => ({ id: v.identifier, name: v.name || v.identifier, language: v.language.replace('_', '-') }))
    .sort((a, b) => a.language.localeCompare(b.language) || a.name.localeCompare(b.name));
}

export interface LoadVoicesOptions {
  retries?: number;
  delayMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

// En Android la lista puede llegar vacía justo al iniciar el motor TTS: se reintenta.
export async function loadSpanishVoices({ retries = 3, delayMs = 600, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) }: LoadVoicesOptions = {}): Promise<VoiceInfo[]> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const voices = filterSpanishVoices(await Speech.getAvailableVoicesAsync());
      if (voices.length > 0) return voices;
    } catch {
      // se reintenta
    }
    if (attempt < retries) await sleep(delayMs);
  }
  return [];
}

export { splitForSpeech } from './split';

export interface SpeakOptions {
  voiceId?: string | null;
  rate?: number;
  pitch?: number;
  onDone?: () => void;
  onError?: () => void;
}

let session = 0;

export function speak(text: string, { voiceId, rate = 1, pitch = 1, onDone, onError }: SpeakOptions = {}): void {
  const token = ++session; // una nueva lectura invalida la cadena anterior
  const segments = splitForSpeech(text, Speech.maxSpeechInputLength || 4000);
  if (segments.length === 0) return onDone?.();
  Speech.stop();
  const next = (i: number) => {
    if (token !== session) return;
    if (i >= segments.length) return onDone?.();
    Speech.speak(segments[i], {
      language: 'es',
      ...(voiceId ? { voice: voiceId } : {}),
      rate,
      pitch,
      onDone: () => next(i + 1),
      onStopped: () => undefined,
      onError: () => {
        if (token === session) onError?.();
      },
    });
  };
  next(0);
}

export function stop(): void {
  session++;
  Speech.stop();
}

// ---------- Enrutador: voz del sistema o voz en la nube (temporal, sujeto a cambios) ----------
let cloud: CloudSpeaker | null = null;

// Lo registra el contenedor live (F8) cuando existe el backend de voces.
export function registerCloudSpeaker(speaker: CloudSpeaker | null): void {
  cloud = speaker;
}

export function isCloudAvailable(): boolean {
  return cloud !== null;
}

// Usa la voz en la nube si el `voiceId` lleva el prefijo "cloud:" y hay servidor; si no (o si la nube
// falla: sin red, cuota, etc.) sigue con la voz predeterminada del sistema para no dejar al usuario sin audio.
export function speakAny(text: string, opts: SpeakOptions = {}): void {
  const { voiceId } = opts;
  if (isCloudVoiceId(voiceId) && cloud) {
    stop();
    cloud.speak(text, {
      voiceId: fromCloudVoiceId(voiceId),
      rate: opts.rate,
      onDone: opts.onDone,
      onError: () => speak(text, { rate: opts.rate, pitch: opts.pitch, onDone: opts.onDone, onError: opts.onError }),
    });
    return;
  }
  cloud?.stop();
  speak(text, { ...opts, voiceId: isCloudVoiceId(voiceId) ? null : voiceId });
}

export function stopAny(): void {
  cloud?.stop();
  stop();
}
