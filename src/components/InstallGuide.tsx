import { useState } from 'react';
import { useT } from '../lib/i18n';
import { promptInstall, useInstall, type Platform } from '../lib/install';

const DISMISS_KEY = 'stats-prkl:installDismissed';

function Steps({ p }: { p: Platform }) {
  const t = useT();
  const steps: Record<Platform, string[]> = {
    android: [t.instAndroid1, t.instAndroid2, t.instAndroid3, t.instOpen],
    samsung: [t.instSamsung1, t.instSamsung2, t.instSamsung3, t.instOpen],
    ios: [t.instIos0, t.instIos1, t.instIos2, t.instIos3, t.instOpen],
    desktop: [t.instDesktop1, t.instDesktop2, t.instOpen]
  };
  return (
    <ol className="install-steps">
      {steps[p].map((s, i) => <li key={i} dangerouslySetInnerHTML={{ __html: s }} />)}
    </ol>
  );
}

/**
 * compact: dismissible banner on the start page (hidden once installed).
 * full: all platforms with tabs, for the About page.
 */
export default function InstallGuide({ compact = false }: { compact?: boolean }) {
  const t = useT();
  const { canPrompt, installed, platform } = useInstall();
  const [tab, setTab] = useState<Platform>(platform);
  const [dismissed, setDismissed] = useState(() => {
    try { return compact && localStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; }
  });

  if (compact && (installed || dismissed)) return null;

  const dismiss = () => {
    setDismissed(true);
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ }
  };

  const tabs: [Platform, string][] = [['android', 'Android (Chrome)'], ['samsung', 'Samsung Internet'], ['ios', 'iPhone / iPad'], ['desktop', t.instComputer]];

  return (
    <section className={'install card' + (compact ? ' compact' : '')}>
      <div className="row between">
        <h2>📲 {installed ? t.instInstalledTitle : t.instTitle}</h2>
        {compact && <button className="icon" onClick={dismiss} aria-label={t.cancel}>✕</button>}
      </div>
      {installed ? (
        <p>{t.instInstalledText}</p>
      ) : (
        <>
          <p className="install-why">{t.instWhy}</p>
          <ul className="install-benefits">
            <li>⛶ {t.instBenefit1}</li>
            <li>📴 {t.instBenefit2}</li>
            <li>↔️ {t.instBenefit3}</li>
            <li>🏒 {t.instBenefit4}</li>
          </ul>
          {canPrompt && (
            <button className="primary big" onClick={() => promptInstall()}>⬇ {t.instButton}</button>
          )}
          {!compact && (
            <div className="seg install-tabs">
              {tabs.map(([p, label]) => <button key={p} className={tab === p ? 'on' : ''} onClick={() => setTab(p)}>{label}</button>)}
            </div>
          )}
          {(!canPrompt || !compact) && <Steps p={compact ? platform : tab} />}
          {compact && <button className="link" onClick={() => { location.hash = '#/about'; }}>{t.instMore} →</button>}
        </>
      )}
    </section>
  );
}
