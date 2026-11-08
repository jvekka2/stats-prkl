import { go } from '../lib/router';
import { deleteGame, useData } from '../lib/store';
import { useLang, useT } from '../lib/i18n';
import { formatDate } from '../lib/share';
import { finalScore, isOnGoal } from '../lib/stats';
import { periodLabel } from '../lib/clock';

export default function GamesView() {
  const { games, teams } = useData();
  const t = useT();
  const lang = useLang();
  const sorted = [...games].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);

  return (
    <>
      <div className="row between">
        <h1>{t.games}</h1>
        <button className="primary" onClick={() => go(teams.length >= 2 ? 'new' : 'team', teams.length >= 2 ? undefined : 'new')}>+ {t.newGame}</button>
      </div>
      {sorted.length === 0 && <p className="empty">{t.noGames}</p>}
      <div className="list">
        {sorted.map(g => {
          const s = finalScore(g);
          const sog = { home: 0, away: 0 };
          g.shots.forEach(x => { if (isOnGoal(x.result)) sog[x.team]++; });
          const live = g.status !== 'final';
          return (
            <div key={g.id} className="list-item">
              <button className="grow plain" onClick={() => go(live ? 'live' : 'results', g.id)}>
                <div className="game-line">
                  <span className="swatch" style={{ background: g.home.color }} />
                  <b>{g.home.name}</b>
                  <span className="score-mini">{s.home}–{s.away}</span>
                  <b>{g.away.name}</b>
                  <span className="swatch" style={{ background: g.away.color }} />
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
