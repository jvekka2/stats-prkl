import { useSyncExternalStore } from 'react';

/**
 * Fullscreen support (Android Chrome & desktop). iPhone Safari has no page fullscreen API,
 * so there the button is hidden and the app should be installed to the home screen instead.
 * Browsers only allow entering fullscreen from a user tap.
 */
export const fullscreenSupported = () =>
  typeof document !== 'undefined' && !!document.fullscreenEnabled && !!document.documentElement.requestFullscreen;

export const isFullscreen = () => typeof document !== 'undefined' && !!document.fullscreenElement;

/** Installed home-screen app: the browser bar is already hidden. */
export const isStandalone = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: fullscreen)').matches || window.matchMedia?.('(display-mode: standalone)').matches);

export async function enterFullscreen() {
  if (!fullscreenSupported() || isFullscreen()) return;
  try {
    await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
    // Keep the phone in landscape while tracking (only allowed in fullscreen, mainly Android).
    await (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> })?.lock?.('landscape').catch(() => undefined);
  } catch { /* user/browser refused */ }
}

export async function exitFullscreen() {
  if (!isFullscreen()) return;
  try {
    (screen.orientation as ScreenOrientation & { unlock?: () => void })?.unlock?.();
    await document.exitFullscreen();
  } catch { /* ignore */ }
}

export const toggleFullscreen = () => (isFullscreen() ? exitFullscreen() : enterFullscreen());

export function useFullscreen(): boolean {
  return useSyncExternalStore(
    cb => { document.addEventListener('fullscreenchange', cb); return () => document.removeEventListener('fullscreenchange', cb); },
    isFullscreen,
    () => false
  );
}
