import { useState } from 'react';
import type { Game, Shot, ShotResult, Side } from '../types';
import { SHOT_RESULTS } from '../types';
import { updateGame, uid, useData } from '../lib/store';
import { go } from '../lib/router';
import { useT } from '../lib/i18n';
import { formatElapsed, lastPeriod, parseClock, periodLabel, periodLengthMs } from '../lib/clock';
import { other } from '../lib/stats';
import TeamBadge from '../components/TeamBadge';

export default function ShotTableView({ gameId }: { gameId: string }) {
  const { games } = useData();
  const game = games.find(g => g.id === gameId);
  if (!game) return <p className="empty">404</p>;
  return <ShotTable game={game} />;
}

/** Time cell: edited as text (m:ss elapsed in period), committed on blur/enter. */
function TimeInput({ ms, max, onChange }: { ms: number; max: number; onChange: (ms: number) => void }) {
  const [text, setText] = useState(formatElapsed(ms));
  const [bad, setBad] = useState(false);
  const commit = () => {
    const v = parseClock(text);
    if (v == null || v > max) { setBad(true); return; }
    setBad(false);
    if (v !== ms) onChange(v);
    setText(formatElapsed(v));
  };
  return (
    <input className={'time-input' + (bad ? ' bad' : '')} value={text} inputMode="numeric" size={5}
      onChange={e => setText(e.target.value)} onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
  );
}

function ShotTable({ game }: { game: Game }) {
  const t = useT();
  const [filter, setFilter] = useState<Side | 'all'>('all');
  const labels: Record<ShotResult, string> = { goal: t.goal, save: t.save_, blocked: t.blocked, missed: t.missed };
  const periods = Array.from({ length: Math.max(lastPeriod(game.format), game.clock.period) }, (_, i) => i + 1);

  const rows = game.shots
    .filter(s => filter === 'all' || s.team === filter)
    .sort((a, b) => a.period - b.period || a.timeMs - b.timeMs || a.createdAt - b.createdAt);

  const patch = (id: string, p: Partial<Shot>) =>
    updateGame(game.id, g => ({
      ...g,
      shots: g.shots.map(s => {
        if (s.id !== id) return s;
        const next = { ...s, ...p };
        if (p.team && p.team !== s.team) {
          // Switching team: shooter/assists belong to the other roster, goalie to the new opponent.
          next.shooterId = null; next.assists = []; next.goalieId = g[other(p.team)].goalieId;
          if (!s.noLocation) next.x = 200 - s.x; // mirror to the other team's attacking half
        }
        if (next.result !== 'goal') next.assists = [];
        return next;
      })
    }));

  const remove = (id: string) => updateGame(game.id, g => ({ ...g, shots: g.shots.filter(s => s.id !== id) }));

  const add = () => {
    const team: Side = filter === 'all' ? 'home' : filter;
    const last = rows[rows.length - 1];
    const shot: Shot = {
      id: uid(), team, shooterId: null, result: 'save',
      x: team === 'home' ? 170 : 30, y: 42.5, noLocation: true,
      period: last?.period ?? game.clock.period, timeMs: last?.timeMs ?? 0,
      assists: [], goalieId: game[other(team)].goalieId, createdAt: Date.now()
    };
    updateGame(game.id, g => ({ ...g, shots: [...g.shots, shot] }));
  };

  const setAssist = (s: Shot, idx: 0 | 1, pid: string) => {
    const a = [...s.assists];
    if (pid) a[idx] = pid; else a.splice(idx, 1);
    patch(s.id, { assists: a.filter((x, i) => x && x !== s.shooterId && a.indexOf(x) === i).slice(0, 2) });
  };

  return (
    <>
      <div className="row between wrap">
        <button className="link" onClick={() => go(game.status === 'final' ? 'results' : 'live', game.id)}>← {game.status === 'final' ? t.results : t.resume}</button>
        <div className="seg">
          <button className={filter === 'all' ? 'on' : ''} onClick={() => setFilter('all')}>{t.both}</button>
          {(['home', 'away'] as Side[]).map(sd => (
            <button key={sd} className={filter === sd ? 'on' : ''} onClick={() => setFilter(sd)}>{game[sd].shortName}</button>
          ))}
        </div>
      </div>
      <h1>{t.shotTable}</h1>
      <div className="card flush">
        {rows.length === 0 ? <p className="empty">{t.noShots}</p> : (
          <div className="table-wrap">
            <table className="edit-table">
              <thead>
                <tr>
                  <th>{t.period}</th><th>{t.time}</th><th>{t.team}</th><th>{t.shooter}</th><th>{t.result}</th>
                  <th>{t.assist1}</th><th>{t.assist2}</th><th>{t.goalieCol}</th><th />
                </tr>
              </thead>
              <tbody>
                {rows.map(s => {
                  const own = game[s.team];
                  const opp = game[other(s.team)];
                  const mates = own.players.filter(p => p.id !== s.shooterId);
                  return (
                    <tr key={s.id} className={`r-row r-${s.result}`}>
                      <td>
                        <select value={s.period} onChange={e => patch(s.id, { period: Number(e.target.value) })}>
                          {periods.map(p => <option key={p} value={p}>{periodLabel(p, game.format, t.ot)}</option>)}
                        </select>
                      </td>
                      <td><TimeInput key={s.id + s.timeMs} ms={s.timeMs} max={periodLengthMs(s.period, game.format)} onChange={ms => patch(s.id, { timeMs: ms })} /></td>
                      <td>
                        <div className="team-cell">
                          <TeamBadge team={own} size={22} />
                          <select value={s.team} onChange={e => patch(s.id, { team: e.target.value as Side })}>
                            <option value="home">{game.home.shortName}</option>
                            <option value="away">{game.away.shortName}</option>
                          </select>
                        </div>
                      </td>
                      <td>
                        <select value={s.shooterId ?? ''} onChange={e => patch(s.id, { shooterId: e.target.value || null })}>
                          <option value="">? {t.unknown}</option>
                          {own.players.map(p => <option key={p.id} value={p.id}>#{p.number} {p.name}</option>)}
                        </select>
                      </td>
                      <td>
                        <select className="result-select" value={s.result} onChange={e => patch(s.id, { result: e.target.value as ShotResult })}>
                          {SHOT_RESULTS.map(r => <option key={r} value={r}>{labels[r]}</option>)}
                        </select>
                      </td>
                      {[0, 1].map(i => (
                        <td key={i}>
                          {s.result === 'goal' ? (
                            <select value={s.assists[i] ?? ''} disabled={i === 1 && !s.assists[0]} onChange={e => setAssist(s, i as 0 | 1, e.target.value)}>
                              <option value="">–</option>
                              {mates.map(p => <option key={p.id} value={p.id}>#{p.number} {p.name}</option>)}
                            </select>
                          ) : <span className="muted">–</span>}
                        </td>
                      ))}
                      <td>
                        <select value={s.goalieId ?? ''} onChange={e => patch(s.id, { goalieId: e.target.value || null })}>
                          <option value="">{t.emptyNet}</option>
                          {opp.players.filter(p => p.goalie).map(p => <option key={p.id} value={p.id}>#{p.number} {p.name}</option>)}
                        </select>
                      </td>
                      <td>
                        {s.noLocation && <span className="no-loc" title={t.addRowHint}>⌀</span>}
                        <button className="icon danger" aria-label={t.delete} onClick={() => remove(s.id)}>✕</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="row wrap">
        <button className="primary" onClick={add}>+ {t.addRow}</button>
        <span className="muted small">{t.addRowHint}</span>
      </div>
    </>
  );
}
