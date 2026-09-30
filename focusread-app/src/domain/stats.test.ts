import { makeSession, sessionAtLocal } from '../test/fixtures';
import { computeStats, localDayKey, mergeSessions } from './stats';

// La zona horaria de Jest es America/Mexico_City (jest.setup.js), UTC-6 sin horario de verano.
const at = (d: number, h: number, m = 0, o = {}) => sessionAtLocal(2026, 9, d, h, m, o);
const NOW = new Date(2026, 8, 30, 12, 0); // 30-sep-2026 12:00 local

describe('computeStats', () => {
  it('suma minutos reales (activeSeconds) y dosis completadas de hoy', () => {
    const s = computeStats([at(30, 9, 0, { activeSeconds: 150 }), at(30, 10, 0, { activeSeconds: 90, completed: false })], NOW);
    expect(s.minutesToday).toBe(4);
    expect(s.dosesToday).toBe(1);
    expect(s.completedDoses).toBe(1);
    expect(s.totalMinutes).toBe(4);
  });

  it('sin sesiones todo vale 0 y la retención es null', () => {
    const s = computeStats([], NOW);
    expect(s).toMatchObject({ minutesToday: 0, streakDays: 0, completedDoses: 0, retention: null });
    expect(s.last7Days).toHaveLength(7);
  });

  it('la racha cruza la medianoche usando el día LOCAL, no el UTC', () => {
    // 23:50 local del 28 = 05:50Z del 29; 00:10 local del 29 = 06:10Z del 29 (mismo día UTC, días locales distintos)
    const sessions = [at(28, 23, 50), at(29, 0, 10), at(30, 9, 0)];
    expect(new Date(sessions[0].endedAt).toISOString().slice(0, 10)).toBe('2026-09-29');
    expect(computeStats(sessions, NOW).streakDays).toBe(3);
  });

  it('un día sin leer rompe la racha', () => {
    expect(computeStats([at(27, 9), at(29, 9), at(30, 9)], NOW).streakDays).toBe(2);
  });

  it('si hoy aún no hay lectura, la racha sigue viva desde ayer', () => {
    expect(computeStats([at(28, 9), at(29, 9)], NOW).streakDays).toBe(2);
  });

  it('pasado un día entero sin leer la racha vuelve a 0', () => {
    expect(computeStats([at(27, 9), at(28, 9)], NOW).streakDays).toBe(0);
  });

  it('las sesiones no completadas no cuentan para la racha, pero sí para los minutos', () => {
    const s = computeStats([at(30, 9, 0, { completed: false, activeSeconds: 600 })], NOW);
    expect(s.streakDays).toBe(0);
    expect(s.minutesToday).toBe(10);
  });

  it('últimos 7 días: continuos, con ceros en días sin lectura y excluyendo lo anterior', () => {
    const s = computeStats([at(30, 9, 0, { activeSeconds: 600 }), at(26, 9, 0, { activeSeconds: 300 }), at(22, 9, 0, { activeSeconds: 6000 })], NOW);
    expect(s.last7Days.map((d) => d.date)).toEqual(['2026-09-24', '2026-09-25', '2026-09-26', '2026-09-27', '2026-09-28', '2026-09-29', '2026-09-30']);
    expect(s.last7Days.map((d) => d.minutes)).toEqual([0, 0, 5, 0, 0, 0, 10]);
  });

  it('la ventana de 7 días cruza el cambio de semana y de mes sin perder días', () => {
    const now = new Date(2026, 9, 2, 12, 0); // viernes 2-oct
    const s = computeStats([sessionAtLocal(2026, 9, 30, 20, 0, { activeSeconds: 120 }), sessionAtLocal(2026, 10, 1, 8, 0, { activeSeconds: 180 })], now);
    expect(s.last7Days.map((d) => d.date)).toEqual(['2026-09-26', '2026-09-27', '2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02']);
    expect(s.last7Days.map((d) => d.minutes)).toEqual([0, 0, 0, 0, 2, 3, 0]);
  });

  it('retención = quizCorrect verdaderos / sesiones con quiz', () => {
    const s = computeStats([at(30, 9, 0, { quizCorrect: true }), at(30, 10, 0, { quizCorrect: true }), at(30, 11, 0, { quizCorrect: false }), at(30, 12, 0, { quizCorrect: null })], NOW);
    expect(s.quizSessions).toBe(3);
    expect(s.retention).toBeCloseTo(2 / 3);
  });
});

describe('mergeSessions', () => {
  it('une remotas y pendientes sin duplicar por id', () => {
    const a = makeSession();
    const b = makeSession();
    expect(mergeSessions([a, b], [b])).toHaveLength(2);
  });
});

describe('localDayKey', () => {
  it('usa la fecha local', () => {
    expect(localDayKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});
