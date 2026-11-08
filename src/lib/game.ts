import type { Game, GameFormat, GameTeam, Team } from '../types';
import { sortPlayers } from './roster';

const FORMAT_KEY = 'stats-prkl:lastFormat';
export const DEFAULT_FORMAT: GameFormat = { periods: 3, periodMinutes: 15, clockMode: 'stop', overtime: false, overtimeMinutes: 5, shootout: false };

export function loadFormat(): GameFormat {
  try {
    const v = localStorage.getItem(FORMAT_KEY);
    if (v) return { ...DEFAULT_FORMAT, ...JSON.parse(v) };
  } catch { /* ignore */ }
  return DEFAULT_FORMAT;
}

export function rememberFormat(f: GameFormat) {
  try { localStorage.setItem(FORMAT_KEY, JSON.stringify(f)); } catch { /* ignore */ }
}

export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Snapshot a library team into a game. Defaults: everyone dressed, first goalie starts. */
export function snapTeam(team: Team, dressed?: Set<string>, goalieId?: string | null): GameTeam {
  const players = sortPlayers(dressed ? team.players.filter(p => dressed.has(p.id)) : team.players);
  const gid = goalieId && players.some(p => p.id === goalieId) ? goalieId : players.find(p => p.goalie)?.id ?? null;
  return { teamId: team.id, name: team.name, shortName: team.shortName, color: team.color, logo: team.logo, players, goalieId: gid };
}

export function createGame(id: string, home: GameTeam, away: GameTeam, format: GameFormat, date = today(), venue = ''): Game {
  return {
    id, date, venue, home, away, format,
    clock: { period: 1, elapsedMs: 0, runningSince: null },
    shots: [], shootout: [], status: 'live',
    createdAt: Date.now(), updatedAt: Date.now()
  };
}
