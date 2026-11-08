import { useSyncExternalStore } from 'react';

/** Minimal hash router: #/games, #/teams/ID, #/live/ID, ... */
export type Route = { name: string; id?: string };

function parse(): Route {
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  return { name: parts[0] || 'games', id: parts[1] };
}

let current = parse();
const listeners = new Set<() => void>();
window.addEventListener('hashchange', () => {
  current = parse();
  listeners.forEach(l => l());
  window.scrollTo(0, 0);
});

export function useRoute(): Route {
  return useSyncExternalStore(l => { listeners.add(l); return () => listeners.delete(l); }, () => current);
}

export function go(name: string, id?: string) {
  location.hash = `#/${name}${id ? '/' + id : ''}`;
}
