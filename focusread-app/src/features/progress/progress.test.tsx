import { screen } from '@testing-library/react-native';

import { es } from '../../i18n/es';
import { makeSession } from '../../test/fixtures';
import { createTestContainer, renderScreen, type TestContainer } from '../../test/testContainer';
import { computeStats } from '../../domain/stats';
import { ProgressScreen, toChartData, weekdayOf } from './ProgressScreen';

let mockC: TestContainer;
jest.mock('../../data/container', () => ({ getContainer: () => mockC }));

// Sesión que termina "hoy" hace `minutesAgo` minutos (no cruza la medianoche en la prueba).
const todaySession = (activeSeconds: number, extra = {}) => {
  const end = new Date();
  end.setHours(12, 0, 0, 0);
  return makeSession({ endedAt: end.toISOString(), startedAt: new Date(end.getTime() - 180_000).toISOString(), activeSeconds, ...extra });
};

beforeEach(async () => {
  jest.clearAllMocks();
  mockC = await createTestContainer();
});

describe('Progreso', () => {
  it('sin sesiones muestra ceros y retención sin datos (no inventa métricas)', async () => {
    await renderScreen('Progress', ProgressScreen);
    expect(await screen.findByLabelText(`${es.progress.minutes}: 0`)).toBeTruthy();
    expect(screen.getByLabelText(`${es.progress.doses}: 0`)).toBeTruthy();
    expect(screen.getByLabelText(new RegExp(`^${es.progress.streak}: 0 días`))).toBeTruthy();
    expect(screen.getByLabelText(new RegExp(`^${es.progress.retention}: —`))).toBeTruthy();
    expect(screen.getByText(es.progress.retentionNone)).toBeTruthy();
  });

  it('calcula minutos reales, dosis, racha y retención desde las sesiones', async () => {
    await mockC.progress.recordSession(todaySession(600, { quizCorrect: true })); // 10 min
    await mockC.progress.recordSession(todaySession(300, { quizCorrect: false })); // 5 min
    await mockC.progress.recordSession(todaySession(120, { completed: false })); // 2 min sin completar

    await renderScreen('Progress', ProgressScreen);
    expect(await screen.findByLabelText(`${es.progress.minutes}: 17`)).toBeTruthy();
    expect(screen.getByLabelText(`${es.progress.doses}: 2`)).toBeTruthy();
    expect(screen.getByLabelText(new RegExp(`^${es.progress.streak}: 1 día`))).toBeTruthy();
    expect(screen.getByLabelText(new RegExp(`^${es.progress.retention}: 50 %`))).toBeTruthy();
    expect(screen.getByLabelText(/^Hoy: 17 min leídos, 2 dosis completadas/)).toBeTruthy();
  });

  it('une las sesiones remotas con las pendientes en la outbox sin contarlas dos veces', async () => {
    const shared = todaySession(600);
    const pending = todaySession(300);
    await mockC.progress.recordSession(shared);
    await mockC.outbox.enqueue(shared); // ya sincronizada: misma id
    await mockC.outbox.enqueue(pending); // aún sin sincronizar
    await renderScreen('Progress', ProgressScreen);
    expect(await screen.findByLabelText(`${es.progress.minutes}: 15`)).toBeTruthy();
  });

  it('el gráfico semanal tiene 7 barras con etiqueta accesible y los minutos de hoy', async () => {
    await mockC.progress.recordSession(todaySession(900)); // 15 min
    await renderScreen('Progress', ProgressScreen);
    await screen.findByLabelText(`${es.progress.minutes}: 15`);
    const today = es.progress.weekdays[new Date().getDay()];
    expect(screen.getByLabelText(`${today}, 15 minutos`)).toBeTruthy();
    const labels = es.progress.weekdays.map((d) => screen.queryAllByLabelText(new RegExp(`^${d}, `)).length);
    expect(labels.reduce((a, b) => a + b, 0)).toBe(7);
  });

  it('no existe la métrica inventada "fatiga cognitiva ahorrada"', async () => {
    await renderScreen('Progress', ProgressScreen);
    await screen.findByLabelText(`${es.progress.minutes}: 0`);
    expect(screen.queryByText(/fatiga/i)).toBeNull();
    expect(screen.queryByText(/ahorrad/i)).toBeNull();
  });

  it('si falla la carga muestra el error con reintento', async () => {
    jest.spyOn(mockC.progress, 'listSessions').mockRejectedValueOnce(new Error('disco'));
    await renderScreen('Progress', ProgressScreen);
    expect(await screen.findByText(es.progress.loadFailedTitle)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeTruthy();
  });
});

describe('ayudas del gráfico', () => {
  it('weekdayOf usa la fecha local del día', () => {
    expect(weekdayOf('2026-09-30')).toBe(3); // miércoles
    expect(weekdayOf('2026-10-04')).toBe(0); // domingo
  });

  it('toChartData etiqueta cada día con su inicial y su nombre completo', () => {
    const stats = computeStats([], new Date(2026, 8, 30, 12));
    const data = toChartData(stats);
    expect(data).toHaveLength(7);
    expect(data[6]).toEqual({ label: 'X', fullLabel: 'Miércoles', minutes: 0 });
    expect(data[0].fullLabel).toBe('Jueves'); // 24-sep-2026
  });
});
