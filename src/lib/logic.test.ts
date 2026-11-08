import { describe, expect, it } from 'vitest';
import type { Game, Shot } from '../types';
import { byPeriod, finalScore, goalieLines, skaterLines, svPct } from './stats';
import * as C from './clock';
import { parseRoster, shortName } from './roster';
import { summaryText } from './share';
import { dict } from './i18n';

let n = 0;
const id = () => `id${++n}`;

function makeGame(): Game {
  return {
    id: 'g1', date: '2026-11-08', venue: 'Areena',
    home: {
      teamId: 'h', name: 'Hawks', shortName: 'HAW', color: '#00f', goalieId: 'hg',
      players: [
        { id: 'h1', number: '12', name: 'Matti Meikäläinen', goalie: false },
        { id: 'h2', number: '7', name: 'Ville Virtanen', goalie: false },
        { id: 'hg', number: '30', name: 'Pekka Pakkanen', goalie: true }
      ]
    },
    away: {
      teamId: 'a', name: 'Wolves', shortName: 'WOL', color: '#f00', goalieId: 'ag',
      players: [
        { id: 'a1', number: '9', name: 'Timo Tähti', goalie: false },
        { id: 'ag', number: '1', name: 'Kalle Kassi', goalie: true }
      ]
    },
    format: { periods: 3, periodMinutes: 15, clockMode: 'stop', overtime: true, overtimeMinutes: 5, shootout: true },
    clock: { period: 3, elapsedMs: 0, runningSince: null },
    shots: [], shootout: [], status: 'final', createdAt: 0, updatedAt: 0
  };
}

const shot = (p: Partial<Shot>): Shot => ({
  id: id(), team: 'home', shooterId: 'h1', result: 'save', x: 170, y: 40, period: 1, timeMs: 60_000,
  assists: [], goalieId: 'ag', createdAt: 0, ...p
});

describe('stats', () => {
  const g = makeGame();
  g.shots = [
    shot({ result: 'goal', assists: ['h2'], timeMs: 125_000 }),
    shot({ result: 'save' }),
    shot({ result: 'blocked' }),
    shot({ result: 'missed', shooterId: 'h2', period: 2 }),
    shot({ team: 'away', shooterId: 'a1', result: 'save', goalieId: 'hg', x: 30, period: 2 }),
    shot({ team: 'away', shooterId: null, result: 'goal', goalieId: 'hg', x: 30, period: 3 }),
    shot({ team: 'away', shooterId: 'a1', result: 'missed', goalieId: 'hg', x: 30, period: 3 })
  ];

  it('scores and periods', () => {
    expect(finalScore(g)).toEqual({ home: 1, away: 1, shootoutWinner: null });
    const rows = byPeriod(g);
    expect(rows).toHaveLength(3);
    expect(rows[0].home).toMatchObject({ attempts: 3, onGoal: 2, goals: 1, blocked: 1 });
    expect(rows[1].away.onGoal).toBe(1);
  });

  it('skater lines', () => {
    const lines = skaterLines(g, 'home');
    const matti = lines.find(l => l.player?.id === 'h1')!;
    expect(matti).toMatchObject({ attempts: 3, onGoal: 2, goals: 1, assists: 0, points: 1, blocked: 1, shootingPct: 0.5 });
    const ville = lines.find(l => l.player?.id === 'h2')!;
    expect(ville).toMatchObject({ assists: 1, points: 1, missed: 1, onGoal: 0, shootingPct: null });
    expect(lines[0].player?.id).toBe('h1'); // sorted by points then SOG
    expect(skaterLines(g, 'away').some(l => l.player === null && l.goals === 1)).toBe(true);
  });

  it('goalie lines count only shots on goal', () => {
    const [pekka] = goalieLines(g, 'home');
    expect(pekka).toMatchObject({ shotsAgainst: 2, saves: 1, goalsAgainst: 1, svPct: 0.5 });
    const [kalle] = goalieLines(g, 'away');
    expect(kalle).toMatchObject({ shotsAgainst: 2, saves: 1, goalsAgainst: 1 });
    expect(svPct(0.9123)).toBe('.912');
  });

  it('shootout decides final score', () => {
    const so = { ...g, shootout: [
      { id: '1', team: 'away' as const, shooterId: 'a1', goalieId: 'hg', scored: false },
      { id: '2', team: 'home' as const, shooterId: 'h1', goalieId: 'ag', scored: true }
    ] };
    expect(finalScore(so)).toEqual({ home: 2, away: 1, shootoutWinner: 'home' });
  });

  it('whatsapp text', () => {
    const txt = summaryText(g, dict('fi'), 'fi');
    expect(txt).toContain('*Hawks 1–1 Wolves*');
    expect(txt).toContain('8.11.2026 · Areena');
    expect(txt).toContain('1–0 1/2:05 HAW #12 M. Meikäläinen (#7 V. Virtanen)');
    expect(txt).toContain('HAW #30 P. Pakkanen: 1/2 TO% .500');
  });
});

describe('clock', () => {
  const f = makeGame().format;
  it('runs, stops and caps at period length', () => {
    let c = C.start({ period: 1, elapsedMs: 0, runningSince: null }, 1000);
    expect(C.elapsed(c, f, 61_000)).toBe(60_000);
    c = C.stop(c, f, 61_000);
    expect(C.remaining(c, f)).toBe(14 * 60_000);
    expect(C.elapsed(C.start(c, 0), f, 10 ** 9)).toBe(15 * 60_000);
  });
  it('overtime length and labels', () => {
    expect(C.periodLengthMs(4, f)).toBe(5 * 60_000);
    expect(C.periodLabel(4, f, 'JA')).toBe('JA');
    expect(C.lastPeriod(f)).toBe(4);
  });
  it('parses and formats', () => {
    expect(C.parseClock('12:34')).toBe(754_000);
    expect(C.parseClock('5')).toBe(300_000);
    expect(C.parseClock('1:75')).toBeNull();
    expect(C.formatMs(754_000)).toBe('12:34');
    expect(C.formatMs(500)).toBe('0:01');
    expect(C.setRemaining({ period: 1, elapsedMs: 0, runningSince: null }, f, 10 * 60_000).elapsedMs).toBe(5 * 60_000);
  });
});

describe('roster parsing', () => {
  it('handles common formats', () => {
    const ps = parseRoster('12 Matti Meikäläinen\n#30 Pekka Pakkanen MV\n7, Ville Virtanen (G)\nTimo Tähti 15\n\n  4. Aku Ankka', id);
    expect(ps.map(p => [p.number, p.name, p.goalie])).toEqual([
      ['12', 'Matti Meikäläinen', false],
      ['30', 'Pekka Pakkanen', true],
      ['7', 'Ville Virtanen', true],
      ['15', 'Timo Tähti', false],
      ['4', 'Aku Ankka', false]
    ]);
    expect(shortName(ps[0])).toBe('#12 M. Meikäläinen');
  });
});

describe('demo teams and placeholder rosters', async () => {
  const { demoTeams, ensurePlayers, placeholderPlayers } = await import('./demo');
  it('builds two demo teams with skaters and two goalies each', () => {
    const teams = demoTeams(txt => parseRoster(txt, id));
    expect(teams).toHaveLength(2);
    for (const tm of teams) {
      expect(tm.players.filter(p => p.goalie)).toHaveLength(2);
      expect(tm.players.filter(p => !p.goalie).length).toBeGreaterThanOrEqual(15);
      expect(new Set(tm.players.map(p => p.number)).size).toBe(tm.players.length);
    }
  });
  it('fills an empty roster with goalie #1 and skaters #2-#21', () => {
    const ps = placeholderPlayers(id, 'MV');
    expect(ps).toHaveLength(21);
    expect(ps[0]).toMatchObject({ number: '1', goalie: true });
    expect(ps.filter(p => !p.goalie).map(p => p.number)).toEqual(Array.from({ length: 20 }, (_, i) => String(i + 2)));
    const existing = [{ id: 'x', number: '9', name: 'X', goalie: false }];
    expect(ensurePlayers(existing, id)).toBe(existing);
  });
});
