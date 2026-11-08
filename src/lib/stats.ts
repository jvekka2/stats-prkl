import type { Game, GameTeam, Player, Shot, ShotResult, Side } from '../types';
import { lastPeriod } from './clock';

export const isOnGoal = (r: ShotResult) => r === 'goal' || r === 'save';

export const other = (s: Side): Side => (s === 'home' ? 'away' : 'home');

export function score(game: Game) {
  const s = { home: 0, away: 0 };
  for (const shot of game.shots) if (shot.result === 'goal') s[shot.team]++;
  const so = shootoutWinner(game);
  return { ...s, shootoutWinner: so };
}

/** Final score including the shootout-winning goal (counted as +1, as in most leagues). */
export function finalScore(game: Game) {
  const s = score(game);
  return {
    home: s.home + (s.shootoutWinner === 'home' ? 1 : 0),
    away: s.away + (s.shootoutWinner === 'away' ? 1 : 0),
    shootoutWinner: s.shootoutWinner
  };
}

export function shootoutWinner(game: Game): Side | null {
  if (!game.shootout.length || game.status !== 'final') return null;
  const h = game.shootout.filter(a => a.team === 'home' && a.scored).length;
  const a = game.shootout.filter(a => a.team === 'away' && a.scored).length;
  return h > a ? 'home' : a > h ? 'away' : null;
}

export interface ShotFilter {
  team?: Side | 'all';
  period?: number | 'all';
  playerId?: string | 'all';
  results?: ShotResult[];
}

export function filterShots(shots: Shot[], f: ShotFilter): Shot[] {
  return shots.filter(s =>
    (!f.team || f.team === 'all' || s.team === f.team) &&
    (!f.period || f.period === 'all' || s.period === f.period) &&
    (!f.playerId || f.playerId === 'all' || s.shooterId === f.playerId || s.goalieId === f.playerId) &&
    (!f.results || f.results.includes(s.result))
  );
}

export interface TeamTotals {
  attempts: number;
  onGoal: number;
  goals: number;
  saves: number;
  blocked: number;
  missed: number;
}

export function totals(shots: Shot[]): TeamTotals {
  const t: TeamTotals = { attempts: 0, onGoal: 0, goals: 0, saves: 0, blocked: 0, missed: 0 };
  for (const s of shots) {
    t.attempts++;
    if (isOnGoal(s.result)) t.onGoal++;
    if (s.result === 'goal') t.goals++;
    else if (s.result === 'save') t.saves++;
    else if (s.result === 'blocked') t.blocked++;
    else t.missed++;
  }
  return t;
}

export interface PeriodRow { period: number; home: TeamTotals; away: TeamTotals }

export function byPeriod(game: Game): PeriodRow[] {
  const maxPlayed = Math.max(game.clock.period, ...game.shots.map(s => s.period), 1);
  const n = Math.min(Math.max(game.format.periods, maxPlayed), lastPeriod(game.format));
  const rows: PeriodRow[] = [];
  for (let p = 1; p <= n; p++) {
    const ps = game.shots.filter(s => s.period === p);
    rows.push({ period: p, home: totals(ps.filter(s => s.team === 'home')), away: totals(ps.filter(s => s.team === 'away')) });
  }
  return rows;
}

export interface SkaterLine {
  player: Player | null; // null = unknown shooter
  attempts: number;
  onGoal: number;
  goals: number;
  assists: number;
  points: number;
  blocked: number;
  missed: number;
  shootingPct: number | null;
}

export interface GoalieLine {
  player: Player;
  shotsAgainst: number;
  saves: number;
  goalsAgainst: number;
  svPct: number | null;
}

export function skaterLines(game: Game, side: Side): SkaterLine[] {
  const team = game[side];
  const shots = game.shots.filter(s => s.team === side);
  const line = (p: Player | null): SkaterLine => {
    const mine = shots.filter(s => s.shooterId === (p ? p.id : null));
    const t = totals(mine);
    const assists = p ? shots.filter(s => s.result === 'goal' && s.assists.includes(p.id)).length : 0;
    return {
      player: p, attempts: t.attempts, onGoal: t.onGoal, goals: t.goals, assists,
      points: t.goals + assists, blocked: t.blocked, missed: t.missed,
      shootingPct: t.onGoal ? t.goals / t.onGoal : null
    };
  };
  const lines = team.players.filter(p => !p.goalie).map(line);
  // Goalies show up only if they actually got points (rare but possible).
  for (const g of team.players.filter(p => p.goalie)) {
    const l = line(g);
    if (l.attempts || l.assists) lines.push(l);
  }
  const unknown = line(null);
  if (unknown.attempts) lines.push(unknown);
  return lines.sort((a, b) => b.points - a.points || b.onGoal - a.onGoal || b.attempts - a.attempts);
}

/** Goalie lines: only shots on goal (goals + saves) count against the goalie. */
export function goalieLines(game: Game, side: Side): GoalieLine[] {
  const team: GameTeam = game[side];
  const against = game.shots.filter(s => s.team === other(side) && isOnGoal(s.result));
  return team.players
    .filter(p => p.goalie)
    .map(p => {
      const mine = against.filter(s => s.goalieId === p.id);
      const ga = mine.filter(s => s.result === 'goal').length;
      return { player: p, shotsAgainst: mine.length, saves: mine.length - ga, goalsAgainst: ga, svPct: mine.length ? (mine.length - ga) / mine.length : null };
    })
    .filter(l => l.shotsAgainst > 0 || l.player.id === team.goalieId);
}

export const pct = (v: number | null, digits = 1) => (v == null ? '–' : `${(v * 100).toFixed(digits)}%`);
export const svPct = (v: number | null) => (v == null ? '–' : v.toFixed(3).replace(/^0/, ''));
