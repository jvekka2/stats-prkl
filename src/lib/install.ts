import { useSyncExternalStore } from 'react';

/** Install-to-home-screen support: Android/desktop Chrome give an install prompt, iPhone needs manual steps. */
export type Platform = 'ios' | 'android' | 'samsung' | 'desktop';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
let installedNow = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault(); // show our own button instead of the mini-infobar
    deferred = e as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener('appinstalled', () => { installedNow = true; deferred = null; emit(); });
}

export function platform(): Platform {
  const ua = navigator.userAgent;
  const iPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  if (/iPhone|iPad|iPod/.test(ua) || iPadOS) return 'ios';
  if (/SamsungBrowser/.test(ua)) return 'samsung';
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
}

/** Running as the installed app (opened from the home screen icon). */
export const isInstalled = () =>
  installedNow ||
  window.matchMedia?.('(display-mode: standalone)').matches ||
  window.matchMedia?.('(display-mode: fullscreen)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  await deferred.prompt();
  const { outcome } = await deferred.userChoice;
  deferred = null;
  emit();
  return outcome === 'accepted';
}

const snapshot = () => `${!!deferred}|${isInstalled()}`;

export function useInstall() {
  const snap = useSyncExternalStore(l => { listeners.add(l); return () => listeners.delete(l); }, snapshot);
  const [canPrompt, installed] = snap.split('|').map(v => v === 'true');
  return { canPrompt, installed, platform: platform() };
}
