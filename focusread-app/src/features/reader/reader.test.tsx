import { AppState } from 'react-native';
import { act, fireEvent, renderHook, screen, waitFor } from '@testing-library/react-native';

import { buildDemoArticles } from '../../data/mock/demoArticles';
import type { ArticleWithDoses } from '../../domain/contract';
import { es } from '../../i18n/es';
import { usePlayerStore } from '../../state/playerStore';
import { useSettingsStore } from '../../state/settingsStore';
import { createTestContainer, renderScreen, type TestContainer } from '../../test/testContainer';
import { ReaderScreen } from './ReaderScreen';
import { useActiveTime } from './useActiveTime';

let mockC: TestContainer;
jest.mock('../../data/container', () => ({ getContainer: () => mockC }));

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
let article: ArticleWithDoses; // 2 dosis; el quiz está en la última

const renderReader = async (doseIndex = 0) => renderScreen('Reader', ReaderScreen, { params: { articleId: article.id, doseIndex } });
// Desde 1970: algunas pruebas congelan Date.now en valores pequeños.
const sessions = async () => mockC.progress.listSessions('1970-01-01T00:00:00.000Z');

afterEach(() => jest.restoreAllMocks()); // devuelve Date.now / AppState aunque una prueba falle

beforeEach(async () => {
  jest.clearAllMocks();
  mockC = await createTestContainer();
  [article] = buildDemoArticles(2.5);
  await mockC.localArticles.save(article);
  usePlayerStore.setState({ item: null, playing: false });
  useSettingsStore.setState({ quizEnabled: true, hapticsEnabled: false, theme: 'paper', readerFontScale: 1, voiceId: null, speechRate: 1, speechPitch: 1 });
});

describe('Lector: contenido', () => {
  it('muestra la dosis, su posición, el resumen y la barra de progreso (sin cuenta regresiva)', async () => {
    await renderReader();
    expect(await screen.findByText(es.library.doseOf(1, article.doseCount))).toBeTruthy();
    expect(screen.getByText(article.title)).toBeTruthy();
    expect(screen.getByText(es.reader.summary)).toBeTruthy();
    expect(screen.getByRole('progressbar', { name: 'Progreso de la dosis 1' })).toBeTruthy();
    expect(screen.queryByText(/restante|:\d\d/i)).toBeNull(); // no hay cuenta regresiva
  });

  it('abre en la dosis indicada y no muestra el resumen fuera de la primera', async () => {
    await renderReader(1);
    expect(await screen.findByText(es.library.doseOf(2, article.doseCount))).toBeTruthy();
    expect(screen.queryByText(es.reader.summary)).toBeNull();
  });

  it('un artículo inexistente muestra un estado claro', async () => {
    await renderScreen('Reader', ReaderScreen, { params: { articleId: 'no-existe' } });
    expect(await screen.findByText(es.reader.notFoundTitle)).toBeTruthy();
  });
});

describe('Lector: sesiones de lectura', () => {
  it('terminar una dosis registra UNA sesión completada con UUID, tiempo entero y avanza', async () => {
    useSettingsStore.setState({ quizEnabled: false });
    await renderReader();
    await fireEvent.press(await screen.findByRole('button', { name: 'Siguiente dosis' }));

    await waitFor(async () => expect(await sessions()).toHaveLength(1));
    const [s] = await sessions();
    expect(s).toMatchObject({ articleId: article.id, doseId: article.doses[0].id, completed: true, quizCorrect: null });
    expect(s.id).toMatch(UUID);
    expect(Number.isInteger(s.activeSeconds)).toBe(true);
    expect(s.activeSeconds).toBeGreaterThanOrEqual(0);
    expect(s.activeSeconds).toBeLessThanOrEqual(7200);
    expect(new Date(s.endedAt).getTime()).toBeGreaterThanOrEqual(new Date(s.startedAt).getTime());
    expect(await screen.findByText(es.library.doseOf(2, article.doseCount))).toBeTruthy();
  });

  it('la última dosis cierra el lector (goBack) y cuenta como completada', async () => {
    useSettingsStore.setState({ quizEnabled: false });
    await renderReader(1);
    await fireEvent.press(await screen.findByRole('button', { name: 'Terminar' }));
    expect(await screen.findByText('pantalla:Home')).toBeTruthy();
    expect(await mockC.progress.articleProgress()).toEqual([expect.objectContaining({ articleId: article.id, completedDoses: 1 })]);
  });

  it('con el quiz activado, la última dosis pide responder y guarda el resultado', async () => {
    await renderReader(1);
    await fireEvent.press(await screen.findByRole('button', { name: 'Terminar' }));
    expect(await screen.findByRole('header', { name: es.reader.quizTitle })).toBeTruthy();
    expect(await sessions()).toHaveLength(0); // aún no se guarda: falta responder

    const quiz = article.doses[1].quiz!;
    const wrong = quiz.options.findIndex((_, i) => i !== quiz.correctIndex);
    await fireEvent.press(screen.getByRole('radio', { name: quiz.options[wrong] }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Continuar' }));

    await waitFor(async () => expect(await sessions()).toHaveLength(1));
    expect((await sessions())[0]).toMatchObject({ doseId: article.doses[1].id, completed: true, quizCorrect: false });
  });

  it('responder bien guarda quizCorrect = true', async () => {
    await renderReader(1);
    await fireEvent.press(await screen.findByRole('button', { name: 'Terminar' }));
    const quiz = article.doses[1].quiz!;
    await fireEvent.press(await screen.findByRole('radio', { name: quiz.options[quiz.correctIndex] }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Continuar' }));
    await waitFor(async () => expect((await sessions())[0]?.quizCorrect).toBe(true));
  });

  it('con el quiz desactivado en Ajustes no aparece la pregunta (el switch tiene efecto)', async () => {
    useSettingsStore.setState({ quizEnabled: false });
    await renderReader(1);
    await fireEvent.press(await screen.findByRole('button', { name: 'Terminar' }));
    await waitFor(async () => expect(await sessions()).toHaveLength(1));
    expect(screen.queryByRole('header', { name: es.reader.quizTitle })).toBeNull();
    expect((await sessions())[0].quizCorrect).toBeNull();
  });

  it('cerrar el quiz sin responder no guarda ni avanza', async () => {
    await renderReader(1);
    await fireEvent.press(await screen.findByRole('button', { name: 'Terminar' }));
    await screen.findByRole('header', { name: es.reader.quizTitle });
    await fireEvent.press(screen.getByRole('button', { name: 'Cerrar' }));
    expect(await sessions()).toHaveLength(0);
    expect(screen.queryByRole('header', { name: es.reader.quizTitle })).toBeNull();
    expect(screen.getByText(es.library.doseOf(2, article.doseCount))).toBeTruthy();
  });

  it('salir con ≥ 5 s de lectura activa guarda una sesión parcial (completed = false)', async () => {
    let t = 1_000_000;
    jest.spyOn(Date, 'now').mockImplementation(() => t);
    const { unmount } = await renderReader();
    await screen.findByText(es.library.doseOf(1, article.doseCount));
    t += 12_000; // 12 s leyendo
    await unmount();
    await waitFor(async () => expect(await sessions()).toHaveLength(1));
    expect((await sessions())[0]).toMatchObject({ doseId: article.doses[0].id, completed: false, activeSeconds: 12, quizCorrect: null });
    jest.restoreAllMocks();
  });

  it('salir casi de inmediato no registra nada', async () => {
    let t = 1_000_000;
    jest.spyOn(Date, 'now').mockImplementation(() => t);
    const { unmount } = await renderReader();
    await screen.findByText(es.library.doseOf(1, article.doseCount));
    t += 2_000;
    await unmount();
    await act(async () => void (await Promise.resolve()));
    expect(await sessions()).toHaveLength(0);
    jest.restoreAllMocks();
  });
});

describe('Lector: controles', () => {
  it('el botón de tema y el tamaño de letra escriben en el MISMO settingsStore', async () => {
    await renderReader();
    await fireEvent.press(await screen.findByRole('button', { name: es.reader.theme }));
    expect(useSettingsStore.getState().theme).toBe('sepia');
    await fireEvent.press(screen.getByRole('button', { name: es.reader.theme }));
    expect(useSettingsStore.getState().theme).toBe('dark');
    await fireEvent.press(screen.getByRole('button', { name: es.reader.theme }));
    expect(useSettingsStore.getState().theme).toBe('paper');

    await fireEvent.press(screen.getByRole('button', { name: 'Aumentar tamaño de letra' }));
    expect(useSettingsStore.getState().readerFontScale).toBe(1.1);
    await fireEvent.press(screen.getByRole('button', { name: 'Reducir tamaño de letra' }));
    expect(useSettingsStore.getState().readerFontScale).toBe(1);
  });

  it('el botón de audio lee la dosis con la voz, velocidad y tono de Ajustes y se puede detener', async () => {
    useSettingsStore.setState({ voiceId: 'es-voz-1', speechRate: 1.5, speechPitch: 0.8 });
    await renderReader();
    await fireEvent.press(await screen.findByRole('button', { name: es.reader.listen }));
    const Speech = jest.requireMock('expo-speech');
    expect(usePlayerStore.getState()).toMatchObject({ playing: true, item: { articleId: article.id, doseIndex: 0, title: article.title } });
    expect(Speech.speak.mock.calls[0][0]).toContain(article.doses[0].content.split(' ')[0]);
    expect(Speech.speak.mock.calls[0][1]).toMatchObject({ voice: 'es-voz-1', rate: 1.5, pitch: 0.8 });

    await fireEvent.press(await screen.findByRole('button', { name: es.reader.stopListening }));
    expect(usePlayerStore.getState().playing).toBe(false);
  });

  it('"Anterior" solo aparece después de la primera dosis', async () => {
    await renderReader();
    await screen.findByText(es.library.doseOf(1, article.doseCount));
    expect(screen.queryByRole('button', { name: 'Anterior' })).toBeNull();
    await act(async () => void 0);
  });

  it('volver con el botón atrás regresa a la pantalla anterior', async () => {
    await renderReader();
    await screen.findByText(es.library.doseOf(1, article.doseCount)); // el lector ya cargó
    await fireEvent.press(screen.getByRole('button', { name: es.common.back }));
    expect(await screen.findByText('pantalla:Home', {}, { timeout: 3000 })).toBeTruthy();
  });
});

describe('useActiveTime: tiempo activo real', () => {
  it('se pausa cuando la app pasa a segundo plano y se reanuda al volver', async () => {
    let now = 10_000;
    jest.spyOn(Date, 'now').mockImplementation(() => now);
    let onChange: ((s: string) => void) | undefined;
    jest.spyOn(AppState, 'addEventListener').mockImplementation(((_e: string, cb: (s: string) => void) => {
      onChange = cb;
      return { remove: jest.fn() };
    }) as never);

    const { result } = await renderHook(() => useActiveTime('dosis-1'));
    now += 10_000;
    expect(result.current.getSeconds()).toBe(10);

    await act(async () => onChange?.('background'));
    now += 600_000; // 10 minutos con la app en segundo plano
    expect(result.current.getSeconds()).toBe(10);

    await act(async () => onChange?.('active'));
    now += 5_000;
    expect(result.current.getSeconds()).toBe(15);
    jest.restoreAllMocks();
  });

  it('se reinicia al cambiar de dosis', async () => {
    let now = 50_000;
    jest.spyOn(Date, 'now').mockImplementation(() => now);
    const { result, rerender } = await renderHook(({ k }: { k: string }) => useActiveTime(k), { initialProps: { k: 'a' } });
    now += 8_000;
    expect(result.current.getSeconds()).toBe(8);
    await rerender({ k: 'b' });
    expect(result.current.getSeconds()).toBe(0);
    jest.restoreAllMocks();
  });

  it('nunca supera 7200 s', async () => {
    let now = 0;
    jest.spyOn(Date, 'now').mockImplementation(() => now);
    const { result } = await renderHook(() => useActiveTime('x'));
    now += 99_999_000;
    expect(result.current.getSeconds()).toBe(7200);
    jest.restoreAllMocks();
  });
});
