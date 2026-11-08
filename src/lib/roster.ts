import type { Player } from '../types';

/**
 * Parse a pasted roster, one player per line, e.g.
 *   "12 Matti Meikäläinen", "#30 Pekka MV", "7, Ville Virtanen (G)", "Timo 15"
 * A trailing/leading "G", "MV" or "(G)" marks a goalie.
 */
export function parseRoster(text: string, makeId: () => string): Player[] {
  const out: Player[] = [];
  for (const raw of text.split(/\r?\n/)) {
    let line = raw.trim();
    if (!line) continue;
    let goalie = false;
    const goalieRe = /(^|[\s,(])(mv|g|goalie|maalivahti)\)?\s*$/i;
    if (goalieRe.test(line)) {
      goalie = true;
      line = line.replace(goalieRe, '').trim();
    }
    let number = '';
    let m = line.match(/^#?(\d{1,3})[\s.,:-]*(.*)$/);
    if (m) {
      number = m[1];
      line = m[2];
    } else if ((m = line.match(/^(.*?)[\s,]+#?(\d{1,3})$/))) {
      number = m[2];
      line = m[1];
    }
    const name = line.replace(/[,;]+$/, '').trim();
    if (!number && !name) continue;
    out.push({ id: makeId(), number, name, goalie });
  }
  return out;
}

export const sortPlayers = (ps: Player[]) =>
  [...ps].sort((a, b) => (Number(a.number) || 999) - (Number(b.number) || 999) || a.name.localeCompare(b.name));

export const playerLabel = (p: Player | null | undefined, unknown = '?') =>
  p ? `#${p.number || '?'}${p.name ? ' ' + p.name : ''}` : unknown;

/** Short label: "#12 M. Meikäläinen" → for compact chat output. */
export function shortName(p: Player | null | undefined, unknown = '?'): string {
  if (!p) return unknown;
  const parts = p.name.trim().split(/\s+/).filter(Boolean);
  const nm = parts.length > 1 ? `${parts[0][0]}. ${parts.slice(1).join(' ')}` : parts[0] ?? '';
  return `#${p.number || '?'}${nm ? ' ' + nm : ''}`;
}
