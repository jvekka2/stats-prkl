import { useT } from '../lib/i18n';
import InstallGuide from '../components/InstallGuide';

const REPO = 'https://github.com/jvekka2/stats-prkl';

export default function AboutView() {
  const t = useT();
  const built = new Date(__BUILD_TIME__);
  const features: [string, string, string][] = [
    ['👕', t.featTeamsTitle, t.featTeamsText],
    ['⏱️', t.featClockTitle, t.featClockText],
    ['🎯', t.featTrackTitle, t.featTrackText],
    ['🔥', t.featHeatTitle, t.featHeatText],
    ['📊', t.featStatsTitle, t.featStatsText],
    ['✏️', t.featEditTitle, t.featEditText],
    ['📲', t.featShareTitle, t.featShareText],
    ['📴', t.featOfflineTitle, t.featOfflineText]
  ];

  return (
    <>
      <h1>{t.about}</h1>
      <div className="card about-head">
        <div className="about-logo">🏒</div>
        <div>
          <h2>Stats <span className="accent">PRKL</span></h2>
          <p>{t.aboutText}</p>
          <div className="version">
            <span className="pill">v{__APP_VERSION__}</span>
            <span className="muted small">{t.built} {built.toLocaleDateString()} {built.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
      </div>

      <InstallGuide />

      <h2 className="section-title">{t.features}</h2>
      <div className="features">
        {features.map(([icon, title, text]) => (
          <div key={title} className="feature">
            <span className="feature-icon">{icon}</span>
            <b>{title}</b>
            <span>{text}</span>
          </div>
        ))}
      </div>

      <div className="card mt">
        <h2>{t.privacyTitle}</h2>
        <p className="small">{t.privacyText}</p>
        <p className="small">
          {t.sourceCode}: <a href={REPO} target="_blank" rel="noopener noreferrer">{REPO.replace('https://', '')}</a> · MIT
        </p>
      </div>
    </>
  );
}
