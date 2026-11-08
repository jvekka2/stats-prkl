import type { Player, Team } from '../types';

/** Placeholder roster used when a team is saved without players: goalie #1 and skaters #2–#21. */
export const PLACEHOLDER_SKATERS = 20;

export function placeholderPlayers(makeId: () => string, goalieLabel = 'MV'): Player[] {
  const ps: Player[] = [{ id: makeId(), number: '1', name: goalieLabel, goalie: true }];
  for (let n = 2; n < 2 + PLACEHOLDER_SKATERS; n++) ps.push({ id: makeId(), number: String(n), name: '', goalie: false });
  return ps;
}

/** Return the roster, or a generated placeholder roster if it is empty. */
export function ensurePlayers(players: Player[], makeId: () => string, goalieLabel?: string): Player[] {
  return players.length ? players : placeholderPlayers(makeId, goalieLabel);
}

type DemoTeam = Omit<Team, 'players' | 'updatedAt'> & { roster: string };

// Fictional players for the built-in demo teams.
const DEMO: DemoTeam[] = [
  {
    id: 'demo-haukat', name: 'Haukat (demo)', shortName: 'HAU', color: '#1d4ed8',
    roster: `1 Oskari Ovinen MV
30 Veeti Vahti MV
3 Aaro Aalto
4 Eino Erola
5 Leo Laine
7 Onni Oksanen
8 Elias Ek
10 Väinö Virta
11 Niilo Nurmi
12 Toivo Tuomi
14 Aleksi Aho
16 Joel Jokela
18 Konsta Koski
19 Lenni Lahti
21 Patrik Pelto
23 Samu Saari
27 Valtteri Vuori`
  },
  {
    id: 'demo-sudet', name: 'Sudet (demo)', shortName: 'SUD', color: '#dc2626',
    roster: `33 Miro Maalinen MV
35 Kasper Kassinen MV
2 Arttu Alanen
4 Benjamin Berg
6 Daniel Dahl
9 Emil Eskola
11 Fredrik Forsman
13 Henri Hilli
15 Iivo Isola
17 Jesse Järvi
20 Kalle Kallio
22 Lauri Leino
24 Mikael Mäki
26 Nooa Niemi
28 Oliver Ojala
91 Rasmus Ranta
97 Santeri Salo`
  }
];

export const DEMO_TEAM_IDS = DEMO.map(d => d.id);

export function demoTeams(parse: (text: string) => Player[]): Team[] {
  return DEMO.map(({ roster, ...t }) => ({ ...t, players: parse(roster), updatedAt: Date.now() }));
}
