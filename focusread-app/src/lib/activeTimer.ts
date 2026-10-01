// Mide el tiempo de lectura ACTIVO: se pausa cuando la app no está en primer plano y nunca
// supera el máximo que acepta el contrato (7200 s en ReadingSession.activeSeconds).
export const MAX_ACTIVE_SECONDS = 7200;

export class ActiveTimer {
  private accumulatedMs = 0;
  private runningSince: number | null = null;
  private readonly createdAt: number;
  private firstStartedAt: number | null = null;

  constructor(private readonly now: () => number = Date.now) {
    this.createdAt = now();
  }

  get running(): boolean {
    return this.runningSince !== null;
  }

  start(): void {
    if (this.runningSince === null) {
      this.runningSince = this.now();
      if (this.firstStartedAt === null) this.firstStartedAt = this.runningSince;
    }
  }

  pause(): void {
    if (this.runningSince !== null) {
      this.accumulatedMs += this.now() - this.runningSince;
      this.runningSince = null;
    }
  }

  reset(): void {
    this.accumulatedMs = 0;
    this.runningSince = null;
    this.firstStartedAt = null;
  }

  // Momento (ms) en que empezó la lectura: el primer `start`, o la creación si aún no corrió.
  startedAtMs(): number {
    return this.firstStartedAt ?? this.createdAt;
  }

  elapsedSeconds(): number {
    const live = this.runningSince !== null ? this.now() - this.runningSince : 0;
    return Math.min(MAX_ACTIVE_SECONDS, Math.floor((this.accumulatedMs + live) / 1000));
  }
}
