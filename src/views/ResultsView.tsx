import { useMemo, useState } from 'react';
import type { Game, ShotResult, Side } from '../types';
import { SHOT_RESULTS } from '../types';
import { updateGame, useData } from '../lib/store';
import { go } from '../lib/router';
import { useLang, useT } from '../lib/i18n';
import { byPeriod, filterShots, finalScore, goalieLines, pct, skaterLines, svPct, totals } from '../lib/stats';
import { periodLabel } from '../lib/clock';
import { playerLabel } from '../lib/roster';
import { copyText, formatDate, resultCard, shareImage, summaryText } from '../lib/share';
import Rink, { Legend } from '../components/Rink';
import TeamBadge from '../components/TeamBadge';

export default function ResultsView({ gameId }: { gameId: string }) {
  const { games } = useData();
  const game = games.find(g => g.id === gameId);
  if (!game) return <p className="empty">404</p>;
  return <Results game={game} />;
}

function Results({ game }: { game: Game }) {
  const t = useT();
  const lang = useLang();
  const [mode, setMode] = useState<'dots' | 'heat'>('dots');
  const [team, setTeam] = useState<Side | 'all'>('all');
  const [period, setPeriod] = useState<number | 'all'>('all');
  const [playerId, setPlayerId] = useState<string>('all');
  const [results, setResults] = useState<ShotResult[]>([...SHOT_RESULTS]);
  const [flash, setFlash] = useState('');
  const [busy, setBusy] = useState(false);

  const s = finalScore(game);
  const rows = byPeriod(game);
  const shots = useMemo(() => filterShots(game.shots, { team, period, playerId, results }), [game.shots, team, period, playerId, results]);
  const filteredTotals = totals(shots);
  const labels: Record<ShotResult, string> = { goal: t.goal, save: t.save_, blocked: t.blocked, missed: t.missed };
  const colors = { home: game.home.color, away: game.away.color };

  const toast = (msg: string) => { setFlash(msg); setTimeout(() => setFlash(''), 1800); };

  const onCopy = async () => {
    if (await copyText(summaryText(game, t, lang))) toast(t.copied);
  };
  const onShareText = async () => {
    const text = summaryText(game, t, lang);
    if (navigator.share) { try { await navigator.share({ text }); return; } catch { /* cancelled */ } }
    onCopy();
  };
  const onShareImage = async () => {
    setBusy(true);
    try {
      const blob = await resultCard(game, t, lang);
      await shareImage(blob, `${game.date}_${game.home.shortName}-${game.away.shortName}.png`, `${game.home.name} – ${game.away.name}`);
    } finally { setBusy(false); }
  };

  const playersFor = (side: Side) => game[side].players;
  const toggleResult = (r: ShotResult) => setResults(rs => (rs.includes(r) ? rs.filter(x => x !== r) : [...rs, r]));

  return (
    <>
      <div className="row between wrap">
        <button className="link" onClick={() => go('games')}>← {t.games}</button>
        <button onClick={() => go('edit', game.id)}>✏️ {t.editShots}</button>
        {game.status !== 'final'
          ? <button className="primary" onClick={() => go('live', game.id)}>{t.resume} ▶</button>
          : <button onClick={() => { updateGame(game.id, g => ({ ...g, status: 'live' })); go('live', game.id); }}>{t.reopen}</button>}
      </div>

      <div className="card scorecard">
        <div className="muted small center">{formatDate(game.date, lang)}{game.venue && ` · ${game.venue}`} · {game.status === 'final' ? t.final : t.live}</div>
        <div className="score-row">
          <div className="team-name" style={{ borderColor: game.home.color }}><TeamBadge team={game.home} size={56} /><span>{game.home.name}</span></div>
          <div className="final-score">{s.home}–{s.away}{s.shootoutWinner && <small> {t.so}</small>}</div>
          <div className="team-name" style={{ borderColor: game.away.color }}><TeamBadge team={game.away} size={56} /><span>{game.away.name}</span></div>
        </div>
        <div className="table-wrap">
          <table className="period-table">
            <thead>
              <tr><th /><th colSpan={rows.length + 1}>{t.goals}</th><th className="sep" colSpan={rows.length + 1}>{t.shotsOnGoal}</th><th className="sep">{t.attempts}</th></tr>
              <tr>
                <th />
                {rows.map(r => <th key={'g' + r.period}>{periodLabel(r.period, game.format, t.ot)}</th>)}<th>{t.total}</th>
                {rows.map((r, i) => <th key={'s' + r.period} className={i === 0 ? 'sep' : ''}>{periodLabel(r.period, game.format, t.ot)}</th>)}<th>{t.total}</th>
                <th className="sep" />
              </tr>
            </thead>
            <tbody>
              {(['home', 'away'] as Side[]).map(side => (
                <tr key={side}>
                  <td><span className="swatch" style={{ background: game[side].color }} /> {game[side].shortName}</td>
                  {rows.map(r => <td key={r.period}>{r[side].goals}</td>)}
                  <td><b>{rows.reduce((n, r) => n + r[side].goals, 0)}</b></td>
                  {rows.map((r, i) => <td key={r.period} className={i === 0 ? 'sep' : ''}>{r[side].onGoal}</td>)}
                  <td><b>{rows.reduce((n, r) => n + r[side].onGoal, 0)}</b></td>
                  <td className="sep">{rows.reduce((n, r) => n + r[side].attempts, 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="row wrap center mt">
          <button className="primary" onClick={onCopy}>📋 {t.copyText}</button>
          {'share' in navigator && <button onClick={onShareText}>💬 {t.shareText}</button>}
          <button onClick={onShareImage} disabled={busy}>🖼 {t.shareImage}</button>
        </div>
        {flash && <div className="toast">{flash}</div>}
      </div>

      <div className="card">
        <div className="filters">
          <div className="seg">
            <button className={mode === 'dots' ? 'on' : ''} onClick={() => setMode('dots')}>{t.dots}</button>
            <button className={mode === 'heat' ? 'on' : ''} onClick={() => setMode('heat')}>{t.heatmap}</button>
          </div>
          <select value={team} onChange={e => { setTeam(e.target.value as Side | 'all'); setPlayerId('all'); }}>
            <option value="all">{t.both}</option>
            <option value="home">{game.home.name}</option>
            <option value="away">{game.away.name}</option>
          </select>
          <select value={String(period)} onChange={e => setPeriod(e.target.value === 'all' ? 'all' : Number(e.target.value))}>
            <option value="all">{t.period}: {t.all}</option>
            {rows.map(r => <option key={r.period} value={r.period}>{t.period} {periodLabel(r.period, game.format, t.ot)}</option>)}
          </select>
          <select value={playerId} onChange={e => setPlayerId(e.target.value)}>
            <option value="all">{t.player}: {t.all}</option>
            {(['home', 'away'] as Side[]).map(side => (
              <optgroup key={side} label={game[side].name}>
                {playersFor(side).map(p => <option key={p.id} value={p.id}>{playerLabel(p)}{p.goalie ? ' 🧤' : ''}</option>)}
              </optgroup>
            ))}
          </select>
        </div>
        <div className="chips">
          {SHOT_RESULTS.map(r => (
            <button key={r} className={`chip r-${r}` + (results.includes(r) ? ' on' : '')} onClick={() => toggleResult(r)}>{labels[r]}</button>
          ))}
        </div>
        <Rink shots={shots} colors={colors} mode={mode} labels={{ left: `◀ ${game.away.shortName}`, right: `${game.home.shortName} ▶` }}
          logos={{ home: game.home.logo, away: game.away.logo }} />
        <div className="row between wrap small">
          <Legend t={t} />
          <span className="muted">
            {filteredTotals.attempts} {t.attempts.toLowerCase()} · {filteredTotals.onGoal} {t.colSog} · {filteredTotals.goals} {t.colG}
          </span>
        </div>
      </div>

      {(['home', 'away'] as Side[]).map(side => <TeamTables key={side} game={game} side={side} />)}

      {game.shootout.length > 0 && (
        <div className="card">
          <h2>{t.shootoutAttempts}</h2>
          <ol>
            {game.shootout.map(a => (
              <li key={a.id}>{game[a.team].shortName} {playerLabel(game[a.team].players.find(p => p.id === a.shooterId), t.unknown)} — {a.scored ? `✅ ${t.scored}` : `❌ ${t.notScored}`}</li>
            ))}
          </ol>
        </div>
      )}
    </>
  );
}

function TeamTables({ game, side }: { game: Game; side: Side }) {
  const t = useT();
  const skaters = skaterLines(game, side);
  const goalies = goalieLines(game, side);
  return (
    <div className="card" style={{ borderTop: `4px solid ${game[side].color}` }}>
      <h2 className="row"><TeamBadge team={game[side]} size={32} /> {game[side].name}</h2>
      <div className="table-wrap">
        <table className="stats">
          <thead>
            <tr>
              <th>{t.skaters}</th><th title={t.goals}>{t.colG}</th><th>{t.colA}</th><th>{t.colP}</th>
              <th title={t.shotsOnGoal}>{t.colSog}</th><th title={t.attempts}>{t.colAtt}</th><th>{t.colBlk}</th><th>{t.colMiss}</th><th>{t.colPct}</th>
            </tr>
          </thead>
          <tbody>
            {skaters.map(l => (
              <tr key={l.player?.id ?? 'unknown'} className={l.attempts || l.points ? '' : 'dim'}>
                <td>{playerLabel(l.player, t.unknown)}</td>
                <td>{l.goals}</td><td>{l.assists}</td><td><b>{l.points}</b></td>
                <td>{l.onGoal}</td><td>{l.attempts}</td><td>{l.blocked}</td><td>{l.missed}</td><td>{pct(l.shootingPct, 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {goalies.length > 0 && (
        <div className="table-wrap mt">
          <table className="stats">
            <thead><tr><th>{t.goalies}</th><th>{t.colSa}</th><th>{t.colSv}</th><th>{t.colGa}</th><th>{t.colSvPct}</th></tr></thead>
            <tbody>
              {goalies.map(g => (
                <tr key={g.player.id}>
                  <td>{playerLabel(g.player)}</td><td>{g.shotsAgainst}</td><td>{g.saves}</td><td>{g.goalsAgainst}</td><td><b>{svPct(g.svPct)}</b></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
