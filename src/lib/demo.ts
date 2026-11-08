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

/** Simple original shield crest for demo teams. */
function crest(fill: string, accent: string, letter: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 110">
<path d="M50 4 L94 18 V54 C94 80 74 98 50 106 C26 98 6 80 6 54 V18 Z" fill="#111"/>
<path d="M50 11 L87 23 V54 C87 76 70 91 50 98 C30 91 13 76 13 54 V23 Z" fill="${fill}"/>
<path d="M13 60 L87 40 V50 L13 70 Z" fill="${accent}" opacity="0.9"/>
<text x="50" y="74" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="54" fill="#fff" stroke="#111" stroke-width="3" paint-order="stroke">${letter}</text>
</svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

// Fictional players for the built-in demo teams.
const DEMO: DemoTeam[] = [
  {
    id: 'demo-haukat', name: 'Haukat (demo)', shortName: 'HAU', color: '#1d4ed8', logo: crest('#1d4ed8', '#f08015', 'H'),
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
    id: 'demo-sudet', name: 'Sudet (demo)', shortName: 'SUD', color: '#dc2626', logo: crest('#dc2626', '#111111', 'S'),
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
