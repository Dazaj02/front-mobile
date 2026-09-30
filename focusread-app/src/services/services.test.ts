import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';

import { usePlayerStore } from '../state/playerStore';
import { useSettingsStore } from '../state/settingsStore';
import { ActiveTimer, MAX_ACTIVE_SECONDS } from '../lib/activeTimer';
import { haptic } from './haptics';
import { filterSpanishVoices, loadSpanishVoices, speak, splitForSpeech, stop } from './tts';

const voice = (identifier: string, language: string, name = identifier) =>
  ({ identifier, language, name, quality: 'Default' }) as unknown as Speech.Voice;

describe('ActiveTimer', () => {
  it('acumula solo mientras corre y se puede pausar y reanudar', () => {
    let t = 0;
    const timer = new ActiveTimer(() => t);
    timer.start();
    t = 10_000;
    expect(timer.elapsedSeconds()).toBe(10);
    timer.pause(); // la app pasa a segundo plano
    t = 500_000;
    expect(timer.elapsedSeconds()).toBe(10);
    timer.start();
    t = 505_500;
    expect(timer.elapsedSeconds()).toBe(15);
  });

  it('nunca supera 7200 s', () => {
    let t = 0;
    const timer = new ActiveTimer(() => t);
    timer.start();
    t = 99_999_000;
    expect(timer.elapsedSeconds()).toBe(MAX_ACTIVE_SECONDS);
  });

  it('start dos veces no reinicia y reset vuelve a 0', () => {
    let t = 0;
    const timer = new ActiveTimer(() => t);
    timer.start();
    t = 4000;
    timer.start();
    t = 6000;
    expect(timer.elapsedSeconds()).toBe(6);
    timer.reset();
    expect(timer.elapsedSeconds()).toBe(0);
    expect(timer.running).toBe(false);
  });
});

describe('tts', () => {
  beforeEach(() => jest.clearAllMocks());

  it('solo deja voces reales en español, ordenadas', () => {
    const list = filterSpanishVoices([voice('a', 'en-US'), voice('b', 'es-MX', 'Bravo'), voice('c', 'es_ES', 'Alfa'), voice('d', 'fr-FR'), voice('e', 'es', 'Cero'), voice('f', 'est-EE')]);
    expect(list.map((v) => v.id)).toEqual(['e', 'c', 'b']);
    expect(list[1].language).toBe('es-ES'); // es_ES → es-ES
  });

  it('reintenta si la lista llega vacía al iniciar el motor', async () => {
    const get = Speech.getAvailableVoicesAsync as jest.Mock;
    get.mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce([voice('x', 'es-MX')]);
    const sleep = jest.fn(async () => {});
    const voices = await loadSpanishVoices({ retries: 3, sleep });
    expect(voices.map((v) => v.id)).toEqual(['x']);
    expect(get).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it('devuelve [] tras agotar los reintentos (o si el motor falla)', async () => {
    const get = Speech.getAvailableVoicesAsync as jest.Mock;
    get.mockRejectedValue(new Error('sin motor'));
    expect(await loadSpanishVoices({ retries: 2, sleep: async () => {} })).toEqual([]);
    get.mockResolvedValue([]);
  });

  it('splitForSpeech respeta el límite y corta en oraciones', () => {
    const text = 'Primera oración. Segunda oración más larga. Tercera.';
    const parts = splitForSpeech(text, 30);
    expect(parts.every((p) => p.length <= 30)).toBe(true);
    expect(parts.join(' ')).toBe(text);
    expect(splitForSpeech('corto', 100)).toEqual(['corto']);
    expect(splitForSpeech('  ', 100)).toEqual([]);
    expect(splitForSpeech('x'.repeat(70), 30).map((p) => p.length)).toEqual([30, 30, 10]);
  });

  it('speak usa la voz, velocidad y tono indicados y encadena los segmentos', () => {
    const speakMock = Speech.speak as jest.Mock;
    const onDone = jest.fn();
    const longText = `${'Una oración de prueba. '.repeat(400)}`; // > 4000 caracteres
    speak(longText, { voiceId: 'es-x', rate: 1.5, pitch: 0.8, onDone });
    expect(speakMock).toHaveBeenCalledTimes(1);
    expect(speakMock.mock.calls[0][1]).toMatchObject({ voice: 'es-x', rate: 1.5, pitch: 0.8, language: 'es' });
    const total = Math.ceil(longText.trim().length / 4000);
    for (let i = 0; i < total + 2 && onDone.mock.calls.length === 0; i++) {
      speakMock.mock.calls[speakMock.mock.calls.length - 1][1].onDone();
    }
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(speakMock.mock.calls.length).toBeGreaterThan(1);
  });

  it('una lectura nueva o stop() invalida la cadena anterior', () => {
    const speakMock = Speech.speak as jest.Mock;
    const first = jest.fn();
    speak('x'.repeat(5000), { onDone: first });
    const firstCallOptions = speakMock.mock.calls[0][1];
    stop();
    firstCallOptions.onDone(); // llega tarde: no debe seguir ni terminar
    expect(speakMock).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
  });
});

describe('haptics', () => {
  beforeEach(() => jest.clearAllMocks());

  it('con la vibración apagada no hace nada', async () => {
    await haptic('success', false);
    await haptic('selection', false);
    expect(Haptics.notificationAsync).not.toHaveBeenCalled();
    expect(Haptics.selectionAsync).not.toHaveBeenCalled();
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
  });

  it('con la vibración encendida ejecuta el tipo pedido', async () => {
    await haptic('selection', true);
    await haptic('light', true);
    await haptic('success', true);
    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
    expect(Haptics.impactAsync).toHaveBeenCalledTimes(1);
    expect(Haptics.notificationAsync).toHaveBeenCalledTimes(1);
  });

  it('por defecto respeta el ajuste guardado del usuario', async () => {
    useSettingsStore.setState({ hapticsEnabled: false });
    await haptic('medium');
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
    useSettingsStore.setState({ hapticsEnabled: true });
    await haptic('medium');
    expect(Haptics.impactAsync).toHaveBeenCalledTimes(1);
  });

  it('un fallo del motor háptico no rompe la app', async () => {
    (Haptics.impactAsync as jest.Mock).mockRejectedValueOnce(new Error('sin vibrador'));
    await expect(haptic('light', true)).resolves.toBeUndefined();
  });
});

describe('playerStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usePlayerStore.setState({ item: null, playing: false });
    useSettingsStore.setState({ voiceId: 'voz-1', speechRate: 1.25, speechPitch: 0.9 });
  });

  const item = { articleId: 'a', title: 'T', doseIndex: 0, text: 'Hola mundo.' };

  it('reproduce con la voz, velocidad y tono de Ajustes', () => {
    usePlayerStore.getState().play(item);
    expect(usePlayerStore.getState()).toMatchObject({ playing: true, item });
    expect((Speech.speak as jest.Mock).mock.calls[0][1]).toMatchObject({ voice: 'voz-1', rate: 1.25, pitch: 0.9 });
  });

  it('al terminar la lectura queda en pausa y conserva el elemento', () => {
    usePlayerStore.getState().play(item);
    (Speech.speak as jest.Mock).mock.calls[0][1].onDone();
    expect(usePlayerStore.getState()).toMatchObject({ playing: false, item });
  });

  it('toggle detiene y vuelve a empezar; close lo quita', () => {
    const p = usePlayerStore.getState();
    p.play(item);
    usePlayerStore.getState().toggle();
    expect(Speech.stop).toHaveBeenCalled();
    expect(usePlayerStore.getState().playing).toBe(false);
    usePlayerStore.getState().toggle();
    expect(usePlayerStore.getState().playing).toBe(true);
    usePlayerStore.getState().close();
    expect(usePlayerStore.getState()).toMatchObject({ item: null, playing: false });
  });
});
