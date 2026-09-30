// Estadísticas calculadas desde las sesiones de lectura (nunca contadores sueltos).
// Los días se calculan en la zona horaria del dispositivo.
import type { ReadingSession } from './contract';

export interface DayStat {
  date: string; // YYYY-MM-DD (día local)
  minutes: number;
}

export interface ReadingStats {
  minutesToday: number;
  dosesToday: number;
  totalMinutes: number;
  completedDoses: number;
  streakDays: number;
  last7Days: DayStat[]; // del más antiguo al de hoy
  retention: number | null; // 0–1; null si no hay sesiones con quiz
  quizSessions: number;
}

export function localDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Resta días de calendario (no de 24 h) para respetar cambios de horario.
function addDays(d: Date, days: number): Date {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate() + days, 12);
  return copy;
}

// Une sesiones remotas y pendientes en la outbox sin duplicar por id.
export function mergeSessions(...lists: readonly (readonly ReadingSession[])[]): ReadingSession[] {
  const byId = new Map<string, ReadingSession>();
  for (const list of lists) for (const s of list) byId.set(s.id, s);
  return [...byId.values()];
}

export function computeStats(sessions: readonly ReadingSession[], now: Date = new Date()): ReadingStats {
  const todayKey = localDayKey(now);
  const secondsByDay = new Map<string, number>();
  const completedDays = new Set<string>();
  let totalSeconds = 0;
  let completedDoses = 0;
  let dosesToday = 0;
  let quizSessions = 0;
  let quizCorrect = 0;

  for (const s of sessions) {
    const key = localDayKey(new Date(s.endedAt));
    secondsByDay.set(key, (secondsByDay.get(key) ?? 0) + s.activeSeconds);
    totalSeconds += s.activeSeconds;
    if (s.completed) {
      completedDoses += 1;
      completedDays.add(key);
      if (key === todayKey) dosesToday += 1;
    }
    if (s.quizCorrect !== null) {
      quizSessions += 1;
      if (s.quizCorrect) quizCorrect += 1;
    }
  }

  // Racha: días consecutivos con al menos una sesión completada. Si hoy aún no hay,
  // la racha sigue viva desde ayer (no se rompe hasta que pase un día entero sin leer).
  let streakDays = 0;
  let cursor = completedDays.has(todayKey) ? now : addDays(now, -1);
  while (completedDays.has(localDayKey(cursor))) {
    streakDays += 1;
    cursor = addDays(cursor, -1);
  }

  const last7Days: DayStat[] = [];
  for (let i = 6; i >= 0; i--) {
    const key = localDayKey(addDays(now, -i));
    last7Days.push({ date: key, minutes: round1((secondsByDay.get(key) ?? 0) / 60) });
  }

  return {
    minutesToday: round1((secondsByDay.get(todayKey) ?? 0) / 60),
    dosesToday,
    totalMinutes: round1(totalSeconds / 60),
    completedDoses,
    streakDays,
    last7Days,
    retention: quizSessions === 0 ? null : quizCorrect / quizSessions,
    quizSessions,
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
