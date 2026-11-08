import { useState } from 'react';
import type { Game, Side } from '../types';
import { updateGame, uid } from '../lib/store';
import { useT } from '../lib/i18n';
import { other } from '../lib/stats';
import { shortName } from '../lib/roster';

export default function ShootoutPanel({ game, onEnd }: { game: Game; onEnd: () => void }) {
  const t = useT();
  const attempts = game.shootout;
  const lastTeam = attempts.length ? attempts[attempts.length - 1].team : 'home';
  const [team, setTeam] = useState<Side>(attempts.length ? other(lastTeam) : 'away');
  const [shooter, setShooter] = useState<string | null>(null);

  const add = (scored: boolean) => {
    updateGame(game.id, g => ({
      ...g,
      shootout: [...g.shootout, { id: uid(), team, shooterId: shooter, goalieId: g[other(team)].goalieId, scored }]
    }));
    setShooter(null);
    setTeam(other(team));
  };

  const goals = (s: Side) => attempts.filter(a => a.team === s && a.scored).length;
  const gt = game[team];

  return (
    <div className="shootout">
      <div className="so-score">
        {(['away', 'home'] as Side[]).map(s => (
          <div key={s} className="so-team" style={{ borderColor: game[s].color }}>
            <b>{game[s].shortName}</b> {goals(s)}
            <div className="so-marks">
              {attempts.filter(a => a.team === s).map(a => <span key={a.id}>{a.scored ? '●' : '○'}</span>)}
            </div>
          </div>
        ))}
      </div>
      <div className="row center">
        {(['away', 'home'] as Side[]).map(s => (
          <button key={s} className={'chip' + (team === s ? ' on' : '')} onClick={() => { setTeam(s); setShooter(null); }}>{game[s].name}</button>
        ))}
      </div>
      <div className="player-grid">
        {gt.players.filter(p => !p.goalie).map(p => (
          <button key={p.id} className={'num-btn' + (shooter === p.id ? ' on' : '')} onClick={() => setShooter(p.id)}>
            <span className="n">{p.number}</span><span className="nm">{p.name.split(' ').slice(-1)[0]}</span>
          </button>
        ))}
      </div>
      <div className="row center">
        <button className="result-btn r-goal" onClick={() => add(true)}>{t.scored}</button>
        <button className="result-btn r-missed" onClick={() => add(false)}>{t.notScored}</button>
        <button onClick={() => updateGame(game.id, g => ({ ...g, shootout: g.shootout.slice(0, -1) }))} disabled={!attempts.length}>↶ {t.undo}</button>
        <button className="primary" onClick={onEnd}>{t.endGame}</button>
      </div>
      <div className="small muted center">
        {attempts.map(a => `${game[a.team].shortName} ${shortName(game[a.team].players.find(p => p.id === a.shooterId), t.unknown)} ${a.scored ? '✓' : '✗'}`).join(' · ')}
      </div>
    </div>
  );
}
