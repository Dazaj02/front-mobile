import * as Speech from 'expo-speech';

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

// Parte el texto en segmentos que respetan el límite del motor, cortando en oraciones.
export function splitForSpeech(text: string, maxLength: number): string[] {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLength) return clean ? [clean] : [];
  const segments: string[] = [];
  let current = '';
  for (const sentence of clean.match(/[^.!?…]+[.!?…]*\s*/g) ?? [clean]) {
    if ((current + sentence).length > maxLength && current) {
      segments.push(current.trim());
      current = '';
    }
    let rest = sentence;
    while (rest.length > maxLength) {
      segments.push(rest.slice(0, maxLength).trim());
      rest = rest.slice(maxLength);
    }
    current += rest;
  }
  if (current.trim()) segments.push(current.trim());
  return segments;
}

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
