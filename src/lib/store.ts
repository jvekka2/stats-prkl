import { useSyncExternalStore } from 'react';
import { get, set } from 'idb-keyval';
import type { AppData, Game, Team } from '../types';

const KEY = 'stats-prkl:data:v1';

let data: AppData = { version: 1, teams: [], games: [] };
let loaded = false;
const listeners = new Set<() => void>();

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

function emit() {
  for (const l of listeners) l();
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
function persist() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    set(KEY, data).catch(err => console.error('Save failed', err));
  }, 150);
}

// Flush pending writes when the page is hidden (phone locked, app switched).
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
      set(KEY, data);
    }
  });
}

function update(fn: (d: AppData) => AppData) {
  data = fn(data);
  emit();
  persist();
}

export async function loadData() {
  try {
    const stored = await get<AppData>(KEY);
    if (stored && stored.version === 1) data = stored;
  } catch (err) {
    console.error('Load failed', err);
  }
  loaded = true;
  emit();
  // Ask the browser not to evict our data under storage pressure.
  navigator.storage?.persist?.().catch(() => undefined);
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useData(): AppData {
  return useSyncExternalStore(subscribe, () => data);
}

export const useLoaded = () => useSyncExternalStore(subscribe, () => loaded);

export const getData = () => data;

// ----- Teams -----
export function saveTeam(team: Team) {
  const t = { ...team, updatedAt: Date.now() };
  update(d => ({
    ...d,
    teams: d.teams.some(x => x.id === t.id) ? d.teams.map(x => (x.id === t.id ? t : x)) : [...d.teams, t]
  }));
}

export function deleteTeam(id: string) {
  update(d => ({ ...d, teams: d.teams.filter(t => t.id !== id) }));
}

// ----- Games -----
export function saveGame(game: Game) {
  const g = { ...game, updatedAt: Date.now() };
  update(d => ({
    ...d,
    games: d.games.some(x => x.id === g.id) ? d.games.map(x => (x.id === g.id ? g : x)) : [g, ...d.games]
  }));
}

export function updateGame(id: string, fn: (g: Game) => Game) {
  const g = data.games.find(x => x.id === id);
  if (g) saveGame(fn(g));
}

export function deleteGame(id: string) {
  update(d => ({ ...d, games: d.games.filter(g => g.id !== id) }));
}

// ----- Backup -----
export function exportJson(): string {
  return JSON.stringify(data, null, 2);
}

export function importJson(text: string, mode: 'merge' | 'replace') {
  const incoming = JSON.parse(text) as AppData;
  if (!incoming || incoming.version !== 1 || !Array.isArray(incoming.teams) || !Array.isArray(incoming.games)) {
    throw new Error('Invalid backup file');
  }
  if (mode === 'replace') {
    update(() => incoming);
    return;
  }
  // Merge: newer version of the same id wins.
  const mergeById = <T extends { id: string; updatedAt: number }>(a: T[], b: T[]) => {
    const m = new Map(a.map(x => [x.id, x]));
    for (const x of b) {
      const cur = m.get(x.id);
      if (!cur || x.updatedAt > cur.updatedAt) m.set(x.id, x);
    }
    return [...m.values()];
  };
  update(d => ({ version: 1, teams: mergeById(d.teams, incoming.teams), games: mergeById(d.games, incoming.games) }));
}
