import { useMemo } from 'react';
import type { Shot } from '../types';
import { go } from '../lib/router';
import { addDemoTeams, deleteGame, getData, saveGame, uid, useData } from '../lib/store';
import { useLang, useT } from '../lib/i18n';
import { formatDate } from '../lib/share';
import { finalScore, isOnGoal } from '../lib/stats';
import { periodLabel } from '../lib/clock';
import { createGame, loadFormat, snapTeam } from '../lib/game';
import { DEMO_TEAM_IDS } from '../lib/demo';
import { rinkSvg } from '../lib/rink';
import TeamBadge from '../components/TeamBadge';

// Decorative shots for the hero illustration.
const HERO_SHOTS: Shot[] = [
  [172, 40, 'goal'], [165, 28, 'save'], [158, 52, 'save'], [180, 47, 'missed'], [150, 36, 'blocked'], [168, 60, 'save'],
  [176, 33, 'save'], [142, 45, 'missed'], [30, 42, 'goal'], [38, 30, 'save'], [44, 55, 'save'], [24, 50, 'missed'], [52, 40, 'blocked']
].map(([x, y, result], i) => ({
  id: 'h' + i, team: (x as number) > 100 ? 'home' : 'away', shooterId: null, result: result as Shot['result'],
  x: x as number, y: y as number, period: 1, timeMs: 0, assists: [], goalieId: null, createdAt: 0
}));

function startDemoGame() {
  if (!DEMO_TEAM_IDS.every(id => getData().teams.some(t => t.id === id))) addDemoTeams();
  const [home, away] = DEMO_TEAM_IDS.map(id => getData().teams.find(t => t.id === id)!);
  const game = createGame(uid(), snapTeam(home), snapTeam(away), loadFormat());
  saveGame(game);
  go('live', game.id);
}

export default function GamesView() {
  const { games, teams } = useData();
  const t = useT();
  const lang = useLang();
  const sorted = [...games].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  const heroRink = useMemo(() => rinkSvg(HERO_SHOTS, { home: '#2563eb', away: '#e11d48' }, 1.4), []);
  const liveGame = sorted.find(g => g.status !== 'final');
  const hasDemo = DEMO_TEAM_IDS.some(id => teams.some(tm => tm.id === id));

  const steps = [
    { icon: '👕', title: t.step1Title, text: t.step1Text, done: teams.length >= 2, action: () => go('teams'), color: '#7c3aed' },
    { icon: '⏱️', title: t.step2Title, text: t.step2Text, done: games.length > 0, action: () => go(teams.length >= 2 ? 'new' : 'team', teams.length >= 2 ? undefined : 'new'), color: '#0891b2' },
    { icon: '🎯', title: t.step3Title, text: t.step3Text, done: games.some(g => g.shots.length > 0), action: () => (liveGame ? go('live', liveGame.id) : startDemoGame()), color: '#16a34a' },
    { icon: '📲', title: t.step4Title, text: t.step4Text, done: games.some(g => g.status === 'final'), action: () => sorted[0] && go('results', sorted[0].id), color: '#ea580c' }
  ];

  return (
    <>
      <section className="hero">
        <div className="hero-text">
          <h1>{t.heroTitle}</h1>
          <p>{t.heroText}</p>
          <div className="hero-actions">
            {liveGame ? (
              <button className="cta" onClick={() => go('live', liveGame.id)}>
                🔴 {t.resume}: {liveGame.home.shortName}–{liveGame.away.shortName}
              </button>
            ) : (
              <button className="cta" onClick={startDemoGame}>▶ {t.tryDemo}</button>
            )}
            <button className="ghost" onClick={() => go(teams.length >= 2 ? 'new' : 'team', teams.length >= 2 ? undefined : 'new')}>+ {t.newGame}</button>
          </div>
          {hasDemo && <div className="hero-note">✓ {t.demoReady} · {teams.length} {t.teamsReady}</div>}
        </div>
        <div className="hero-rink" dangerouslySetInnerHTML={{ __html: heroRink }} />
      </section>

      <h2 className="section-title">{t.howItWorks}</h2>
      <div className="steps">
        {steps.map((s, i) => (
          <button key={i} className={'step' + (s.done ? ' done' : '')} style={{ ['--accent' as string]: s.color }} onClick={s.action}>
            <span className="step-num">{s.done ? '✓' : i + 1}</span>
            <span className="step-icon">{s.icon}</span>
            <b>{s.title}</b>
            <span className="step-text">{s.text}</span>
          </button>
        ))}
      </div>

      {sorted.length > 0 && <h2 className="section-title">{t.recentGames}</h2>}
      <div className="list">
        {sorted.map(g => {
          const s = finalScore(g);
          const sog = { home: 0, away: 0 };
          g.shots.forEach(x => { if (isOnGoal(x.result)) sog[x.team]++; });
          const live = g.status !== 'final';
          return (
            <div key={g.id} className="list-item game-card" style={{ ['--home' as string]: g.home.color, ['--away' as string]: g.away.color }}>
              <button className="grow plain" onClick={() => go(live ? 'live' : 'results', g.id)}>
                <div className="game-line">
                  <TeamBadge team={g.home} size={30} />
                  <b>{g.home.name}</b>
                  <span className="score-mini">{s.home}–{s.away}</span>
                  <b>{g.away.name}</b>
                  <TeamBadge team={g.away} size={30} />
                </div>
                <div className="muted small">
                  {formatDate(g.date, lang)} {g.venue && `· ${g.venue}`} · {t.shotsOnGoal.toLowerCase()} {sog.home}–{sog.away}
                  {live
                    ? <span className="pill live">{t.live} · {t.period} {periodLabel(g.clock.period, g.format, t.ot)}</span>
                    : <span className="pill">{t.final}</span>}
                </div>
              </button>
              <button className="icon danger" aria-label={t.delete} onClick={() => { if (confirm(t.confirmDeleteGame)) deleteGame(g.id); }}>✕</button>
            </div>
          );
        })}
      </div>
    </>
  );
}
