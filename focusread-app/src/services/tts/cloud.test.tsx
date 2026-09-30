import * as Speech from 'expo-speech';
import { createAudioPlayer } from 'expo-audio';
import { File } from 'expo-file-system';

import { HttpTtsGateway } from '../../data/api/HttpTtsGateway';
import { createHttpClient } from '../../data/api/httpClient';
import { fromCloudVoiceId, isCloudVoiceId, toCloudVoiceId, TtsRequestSchema } from '../../domain/ttsProposal';
import { AppError } from '../../lib/errors';
import { createCloudSpeaker, type AudioPlayerPort } from './cloud';
import { ExpoAudioPlayer } from './expoAudioPlayer';
import { isCloudAvailable, registerCloudSpeaker, speakAny, stopAny } from './index';

jest.mock('expo-audio', () => ({ createAudioPlayer: jest.fn() }));
jest.mock('expo-file-system', () => {
  const files: { uri: string; create: jest.Mock; write: jest.Mock; delete: jest.Mock }[] = [];
  class File {
    uri: string;
    create = jest.fn();
    write = jest.fn();
    delete = jest.fn();
    constructor(_dir: unknown, name: string) {
      this.uri = `file:///cache/${name}`;
      files.push(this);
    }
  }
  return { File, Paths: { cache: {} }, __files: files };
});

const BYTES = (n: number) => new Uint8Array([n, n, n]);
const flush = () => new Promise<void>((r) => setTimeout(r, 0));

function fakePlayer() {
  const played: Uint8Array[] = [];
  let finishCurrent: (() => void) | null = null;
  const player: AudioPlayerPort & { played: Uint8Array[]; finish: () => void; stopped: jest.Mock } = {
    played,
    stopped: jest.fn(),
    play: (bytes) =>
      new Promise<void>((resolve) => {
        played.push(bytes);
        finishCurrent = resolve;
      }),
    stop: () => {
      player.stopped();
      finishCurrent?.();
      finishCurrent = null;
    },
    finish: () => {
      finishCurrent?.();
      finishCurrent = null;
    },
  };
  return player;
}

describe('ids de voz en la nube', () => {
  it('usan el prefijo "cloud:" dentro del voiceId existente (sin cambiar el contrato de ajustes)', () => {
    expect(toCloudVoiceId('es-MX-JorgeNeural')).toBe('cloud:es-MX-JorgeNeural');
    expect(isCloudVoiceId('cloud:x')).toBe(true);
    expect(isCloudVoiceId('es-us-x-sfb-local')).toBe(false);
    expect(isCloudVoiceId(null)).toBe(false);
    expect(fromCloudVoiceId('cloud:abc')).toBe('abc');
    expect(toCloudVoiceId('x'.repeat(120)).length).toBeLessThanOrEqual(200); // cabe en UserSettings.voiceId (≤ 200)
  });
});

describe('HttpTtsGateway', () => {
  const setup = (fetchImpl: jest.Mock) =>
    new HttpTtsGateway(createHttpClient({ baseUrl: 'https://api.test', getToken: async () => 'jwt', fetchImpl: fetchImpl as never, timeoutMs: 500 }));

  it('lista las voces validando la respuesta', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ voices: [{ id: 'es-MX-JorgeNeural', name: 'Jorge', language: 'es-MX', gender: 'male' }] }), { status: 200 }),
    );
    const voices = await setup(fetchMock).listVoices();
    expect(voices).toEqual([{ id: 'es-MX-JorgeNeural', name: 'Jorge', language: 'es-MX', gender: 'male' }]);
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.test/v1/tts/voices');
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer jwt');
  });

  it('rechaza voces con datos inválidos (género desconocido)', async () => {
    const fetchMock = jest.fn().mockResolvedValue(new Response(JSON.stringify({ voices: [{ id: 'x', name: 'X', language: 'es', gender: 'robot' }] }), { status: 200 }));
    await expect(setup(fetchMock).listVoices()).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });

  it('sintetiza: envía texto, voz y velocidad y devuelve los bytes del audio', async () => {
    const audio = new Uint8Array([1, 2, 3, 4]);
    const fetchMock = jest.fn().mockResolvedValue(new Response(audio, { status: 200, headers: { 'Content-Type': 'audio/mpeg' } }));
    const bytes = await setup(fetchMock).synthesize({ text: 'Hola mundo.', voiceId: 'es-MX-JorgeNeural', rate: 1.25 });
    expect(Array.from(bytes)).toEqual([1, 2, 3, 4]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.test/v1/tts');
    expect(init.method).toBe('POST');
    expect(init.headers.Accept).toBe('audio/mpeg');
    expect(JSON.parse(init.body)).toEqual({ text: 'Hola mundo.', voiceId: 'es-MX-JorgeNeural', rate: 1.25 });
  });

  it('valida la solicitud antes de salir a la red (texto vacío, demasiado largo o velocidad fuera de rango)', async () => {
    const fetchMock = jest.fn();
    const gw = setup(fetchMock);
    for (const bad of [{ text: '', voiceId: 'v' }, { text: 'x'.repeat(4001), voiceId: 'v' }, { text: 'hola', voiceId: 'v', rate: 3 }]) {
      await expect(gw.synthesize(bad)).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    }
    expect(fetchMock).not.toHaveBeenCalled();
    expect(TtsRequestSchema.parse({ text: 'hola', voiceId: 'v' }).rate).toBe(1); // velocidad por defecto
  });

  it('traduce los errores del servidor (cuota, límite) y el audio vacío', async () => {
    const quota = jest.fn().mockResolvedValue(new Response(JSON.stringify({ error: { code: 'QUOTA_EXCEEDED', message: 'x' } }), { status: 429, headers: { 'Retry-After': '120' } }));
    await expect(setup(quota).synthesize({ text: 'hola', voiceId: 'v' })).rejects.toMatchObject({ code: 'QUOTA_EXCEEDED', retryAfterSeconds: 120 });
    const empty = jest.fn().mockResolvedValue(new Response(new Uint8Array(0), { status: 200 }));
    await expect(setup(empty).synthesize({ text: 'hola', voiceId: 'v' })).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });
});

describe('createCloudSpeaker', () => {
  it('sintetiza y reproduce en orden, y pide el siguiente segmento mientras suena el actual', async () => {
    const player = fakePlayer();
    const synthesize = jest.fn(async ({ text }: { text: string }) => BYTES(text.startsWith('A') ? 1 : 2));
    const speaker = createCloudSpeaker({ gateway: { synthesize }, player });
    const onDone = jest.fn();
    const text = `${'A'.repeat(3000)}. ${'B'.repeat(3000)}.`; // > 4000 → 2 segmentos
    speaker.speak(text, { voiceId: 'es-MX-Jorge', rate: 1.5, onDone });
    await flush();

    expect(synthesize).toHaveBeenCalledTimes(2); // el segundo ya se pidió mientras suena el primero
    expect(synthesize.mock.calls[0][0]).toMatchObject({ voiceId: 'es-MX-Jorge', rate: 1.5 });
    expect(player.played).toHaveLength(1);
    expect(onDone).not.toHaveBeenCalled();

    player.finish();
    await flush();
    expect(player.played).toHaveLength(2);
    expect(Array.from(player.played[0])).toEqual([1, 1, 1]);
    expect(Array.from(player.played[1])).toEqual([2, 2, 2]);

    player.finish();
    await flush();
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('detener cancela la cadena: no se reproducen más segmentos ni se avisa de fin', async () => {
    const player = fakePlayer();
    const speaker = createCloudSpeaker({ gateway: { synthesize: jest.fn(async () => BYTES(1)) }, player });
    const onDone = jest.fn();
    speaker.speak(`${'A'.repeat(3000)}. ${'B'.repeat(3000)}.`, { voiceId: 'v', onDone });
    await flush();
    speaker.stop();
    await flush();
    expect(player.played).toHaveLength(1);
    expect(onDone).not.toHaveBeenCalled();
  });

  it('un error de síntesis llega a onError (y no a onDone)', async () => {
    const player = fakePlayer();
    const speaker = createCloudSpeaker({ gateway: { synthesize: jest.fn().mockRejectedValue(new AppError('QUOTA_EXCEEDED', 'x')) }, player });
    const onError = jest.fn();
    const onDone = jest.fn();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    speaker.speak('Hola mundo.', { voiceId: 'v', onError, onDone });
    await flush();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onDone).not.toHaveBeenCalled();
  });

  it('una nueva lectura invalida la anterior', async () => {
    const player = fakePlayer();
    const synthesize = jest.fn(async () => BYTES(1));
    const speaker = createCloudSpeaker({ gateway: { synthesize }, player });
    const first = jest.fn();
    speaker.speak('Primera.', { voiceId: 'v', onDone: first });
    speaker.speak('Segunda.', { voiceId: 'v' });
    await flush();
    player.finish();
    await flush();
    expect(first).not.toHaveBeenCalled();
  });
});

describe('speakAny: voz del sistema o de la nube', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    registerCloudSpeaker(null);
  });
  afterEach(() => registerCloudSpeaker(null));

  it('sin servidor, una voz "cloud:" cae a la voz del sistema por defecto (nunca se queda mudo)', () => {
    expect(isCloudAvailable()).toBe(false);
    speakAny('Hola mundo.', { voiceId: 'cloud:es-MX-Jorge', rate: 1.2, pitch: 0.9 });
    const opts = (Speech.speak as jest.Mock).mock.calls[0][1];
    expect(opts).toMatchObject({ rate: 1.2, pitch: 0.9 });
    expect(opts.voice).toBeUndefined(); // no se pasa un id de la nube al motor del sistema
  });

  it('una voz del sistema usa expo-speech con su identificador', () => {
    speakAny('Hola.', { voiceId: 'es-us-x-sfb-local' });
    expect((Speech.speak as jest.Mock).mock.calls[0][1].voice).toBe('es-us-x-sfb-local');
  });

  it('con servidor, una voz "cloud:" usa la nube con el id del servidor y no el motor del sistema', () => {
    const speak = jest.fn();
    registerCloudSpeaker({ speak, stop: jest.fn() });
    speakAny('Hola.', { voiceId: 'cloud:es-MX-Jorge', rate: 1.5 });
    expect(speak).toHaveBeenCalledWith('Hola.', expect.objectContaining({ voiceId: 'es-MX-Jorge', rate: 1.5 }));
    expect(Speech.speak).not.toHaveBeenCalled();
  });

  it('si la nube falla, continúa con la voz del sistema', () => {
    const speak = jest.fn();
    registerCloudSpeaker({ speak, stop: jest.fn() });
    const onDone = jest.fn();
    speakAny('Texto.', { voiceId: 'cloud:x', rate: 1, pitch: 1, onDone });
    (speak.mock.calls[0][1] as { onError: () => void }).onError();
    expect(Speech.speak).toHaveBeenCalledTimes(1);
    expect((Speech.speak as jest.Mock).mock.calls[0][0]).toBe('Texto.');
  });

  it('elegir una voz del sistema detiene la nube, y stopAny detiene ambas', () => {
    const cloudStop = jest.fn();
    registerCloudSpeaker({ speak: jest.fn(), stop: cloudStop });
    speakAny('Hola.', { voiceId: 'es-x' });
    expect(cloudStop).toHaveBeenCalled();
    cloudStop.mockClear();
    stopAny();
    expect(cloudStop).toHaveBeenCalled();
    expect(Speech.stop).toHaveBeenCalled();
  });
});

describe('ExpoAudioPlayer', () => {
  type Listener = (status: { didJustFinish: boolean }) => void;
  const makePlayer = () => {
    let listener: Listener | undefined;
    const player = {
      addListener: jest.fn((_e: string, cb: Listener) => void (listener = cb)),
      play: jest.fn(),
      remove: jest.fn(),
    };
    (createAudioPlayer as jest.Mock).mockReturnValue(player);
    return { player, finish: () => listener?.({ didJustFinish: true }) };
  };
  const files = () => (jest.requireMock('expo-file-system') as { __files: { create: jest.Mock; write: jest.Mock; delete: jest.Mock; uri: string }[] }).__files;

  beforeEach(() => {
    jest.clearAllMocks();
    files().length = 0;
  });

  it('escribe el audio en la caché, lo reproduce y al terminar libera el reproductor y borra el archivo', async () => {
    const { player, finish } = makePlayer();
    const p = new ExpoAudioPlayer();
    const done = jest.fn();
    const promise = p.play(new Uint8Array([9, 9])).then(done);
    const [file] = files();
    expect(file.create).toHaveBeenCalledWith({ overwrite: true });
    expect(Array.from(file.write.mock.calls[0][0] as Uint8Array)).toEqual([9, 9]);
    expect(createAudioPlayer).toHaveBeenCalledWith(file.uri);
    expect(player.play).toHaveBeenCalled();
    expect(done).not.toHaveBeenCalled();

    finish();
    await promise;
    expect(done).toHaveBeenCalled();
    expect(player.remove).toHaveBeenCalled();
    expect(file.delete).toHaveBeenCalled();
  });

  it('stop() libera todo y resuelve la reproducción pendiente', async () => {
    const { player } = makePlayer();
    const p = new ExpoAudioPlayer();
    const promise = p.play(new Uint8Array([1]));
    p.stop();
    await promise;
    expect(player.remove).toHaveBeenCalled();
    expect(files()[0].delete).toHaveBeenCalled();
  });

  it('si falla la escritura o el reproductor, rechaza la promesa', async () => {
    (createAudioPlayer as jest.Mock).mockImplementation(() => {
      throw new Error('sin audio');
    });
    await expect(new ExpoAudioPlayer().play(new Uint8Array([1]))).rejects.toThrow('sin audio');
  });

  void File;
});
