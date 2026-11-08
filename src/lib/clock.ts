import type { ClockState, GameFormat } from '../types';

export const isOvertime = (period: number, f: GameFormat) => period > f.periods;

export const periodLengthMs = (period: number, f: GameFormat) =>
  (isOvertime(period, f) ? f.overtimeMinutes : f.periodMinutes) * 60_000;

export const lastPeriod = (f: GameFormat) => f.periods + (f.overtime ? 1 : 0);

/** Elapsed ms in the current period, capped at the period length. */
export function elapsed(clock: ClockState, f: GameFormat, now = Date.now()): number {
  const run = clock.runningSince != null ? now - clock.runningSince : 0;
  return Math.min(periodLengthMs(clock.period, f), Math.max(0, clock.elapsedMs + run));
}

export const remaining = (clock: ClockState, f: GameFormat, now = Date.now()) =>
  periodLengthMs(clock.period, f) - elapsed(clock, f, now);

export function formatMs(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Game-clock style time of an event: elapsed in period, e.g. "12:34". */
export const formatElapsed = (ms: number) => formatMs(Math.floor(ms / 1000) * 1000);

export function periodLabel(period: number, f: GameFormat, otLabel = 'OT'): string {
  return isOvertime(period, f) ? otLabel : String(period);
}

export function start(clock: ClockState, now = Date.now()): ClockState {
  return clock.runningSince != null ? clock : { ...clock, runningSince: now };
}

export function stop(clock: ClockState, f: GameFormat, now = Date.now()): ClockState {
  return { ...clock, elapsedMs: elapsed(clock, f, now), runningSince: null };
}

export function setRemaining(clock: ClockState, f: GameFormat, remainingMs: number): ClockState {
  const len = periodLengthMs(clock.period, f);
  const el = Math.min(len, Math.max(0, len - remainingMs));
  return { ...clock, elapsedMs: el, runningSince: clock.runningSince != null ? Date.now() : null };
}

export function nextPeriod(clock: ClockState): ClockState {
  return { period: clock.period + 1, elapsedMs: 0, runningSince: null };
}

export function prevPeriod(clock: ClockState): ClockState {
  return { period: Math.max(1, clock.period - 1), elapsedMs: 0, runningSince: null };
}

/** Parse "m:ss" or "mm" → ms, or null. */
export function parseClock(text: string): number | null {
  const m = text.trim().match(/^(\d{1,2})(?::(\d{1,2}))?$/);
  if (!m) return null;
  const sec = Number(m[2] ?? 0);
  if (sec > 59) return null;
  return (Number(m[1]) * 60 + sec) * 1000;
}
