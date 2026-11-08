export type Side = 'home' | 'away';
export type ShotResult = 'goal' | 'save' | 'blocked' | 'missed';
export const SHOT_RESULTS: ShotResult[] = ['goal', 'save', 'blocked', 'missed'];

export interface Player {
  id: string;
  number: string;
  name: string;
  goalie: boolean;
}

/** A team in the reusable team library. */
export interface Team {
  id: string;
  name: string;
  shortName: string;
  color: string;
  /** Logo as a data: URL (stored on this device only). */
  logo?: string;
  players: Player[];
  updatedAt: number;
}

/** A team as it played in one game: a snapshot so later roster edits don't change old games. */
export interface GameTeam {
  teamId: string | null;
  name: string;
  shortName: string;
  color: string;
  logo?: string;
  players: Player[]; // dressed players
  goalieId: string | null; // goalie in net (null = empty net)
}

export type ClockMode = 'stop' | 'running';

export interface GameFormat {
  periods: number;
  periodMinutes: number;
  clockMode: ClockMode;
  overtime: boolean;
  overtimeMinutes: number;
  shootout: boolean;
}

export interface Shot {
  id: string;
  team: Side; // shooting team
  shooterId: string | null; // null = unknown shooter
  result: ShotResult;
  /** Rink coordinates in feet: x 0..200 (left→right), y 0..85 (top→bottom). Home attacks right. */
  x: number;
  y: number;
  /** True for shots added from the table without a rink location (not drawn on maps). */
  noLocation?: boolean;
  period: number; // 1..periods, periods+1 = OT
  timeMs: number; // elapsed time in period
  assists: string[];
  goalieId: string | null; // defending goalie at the time of the shot
  createdAt: number;
}

export interface ShootoutAttempt {
  id: string;
  team: Side;
  shooterId: string | null;
  goalieId: string | null;
  scored: boolean;
}

export interface ClockState {
  period: number;
  elapsedMs: number; // elapsed when last stopped
  runningSince: number | null; // epoch ms when started, null if stopped
}

export type GameStatus = 'live' | 'shootout' | 'final';

export interface Game {
  id: string;
  date: string; // YYYY-MM-DD
  venue: string;
  home: GameTeam;
  away: GameTeam;
  format: GameFormat;
  clock: ClockState;
  shots: Shot[];
  shootout: ShootoutAttempt[];
  status: GameStatus;
  createdAt: number;
  updatedAt: number;
}

export interface AppData {
  version: 1;
  teams: Team[];
  games: Game[];
}
