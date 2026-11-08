import { useState } from 'react';
import type { Player, Team } from '../types';
import { deleteTeam, saveTeam, uid, useData } from '../lib/store';
import { go } from '../lib/router';
import { useT } from '../lib/i18n';
import { parseRoster, sortPlayers } from '../lib/roster';
import { ensurePlayers } from '../lib/demo';

export const TEAM_COLORS = ['#1d4ed8', '#dc2626', '#16a34a', '#f59e0b', '#7c3aed', '#0891b2', '#db2777', '#111827', '#ea580c', '#65a30d'];

const abbreviate = (name: string) => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length < 2) return name.trim().slice(0, 3).toUpperCase();
  return words.map(w => w[0]).join('').slice(0, 4).toUpperCase();
};

export default function TeamEditView({ teamId }: { teamId?: string }) {
  const { teams } = useData();
  const t = useT();
  const existing = teams.find(x => x.id === teamId);
  const [team, setTeam] = useState<Team>(() =>
    existing ?? { id: uid(), name: '', shortName: '', color: TEAM_COLORS[teams.length % TEAM_COLORS.length], players: [], updatedAt: 0 }
  );
  const [paste, setPaste] = useState('');
  const [showPaste, setShowPaste] = useState(false);

  const setPlayer = (id: string, patch: Partial<Player>) =>
    setTeam(tm => ({ ...tm, players: tm.players.map(p => (p.id === id ? { ...p, ...patch } : p)) }));

  const addPlayer = () =>
    setTeam(tm => ({ ...tm, players: [...tm.players, { id: uid(), number: '', name: '', goalie: false }] }));

  const addPasted = () => {
    const ps = parseRoster(paste, uid);
    setTeam(tm => ({ ...tm, players: [...tm.players, ...ps] }));
    setPaste('');
    setShowPaste(false);
  };

  const save = () => {
    if (!team.name.trim()) return;
    saveTeam({
      ...team,
      name: team.name.trim(),
      shortName: (team.shortName.trim() || abbreviate(team.name)).toUpperCase(),
      // Players are optional: an empty roster becomes goalie #1 + skaters #2–#21.
      players: sortPlayers(ensurePlayers(team.players.filter(p => p.number.trim() || p.name.trim()), uid, t.goalie))
    });
    go('teams');
  };

  return (
    <form onSubmit={e => { e.preventDefault(); save(); }}>
      <h1>{existing ? t.editTeam : t.addTeam}</h1>
      <div className="card">
        <div className="row wrap">
          <label className="grow">{t.teamName}
            <input required value={team.name} onChange={e => setTeam({ ...team, name: e.target.value })} autoFocus={!existing} />
          </label>
          <label>{t.shortName}
            <input value={team.shortName} maxLength={5} size={5} placeholder={abbreviate(team.name)}
              onChange={e => setTeam({ ...team, shortName: e.target.value })} />
          </label>
        </div>
        <div className="colors">
          {TEAM_COLORS.map(c => (
            <button type="button" key={c} className={'swatch big' + (team.color === c ? ' selected' : '')}
              style={{ background: c }} onClick={() => setTeam({ ...team, color: c })} aria-label={c} />
          ))}
          <input type="color" value={team.color} onChange={e => setTeam({ ...team, color: e.target.value })} aria-label={t.color} />
        </div>
      </div>

      <div className="card">
        <div className="row between">
          <h2>{t.players} ({team.players.length})</h2>
          <button type="button" onClick={() => setShowPaste(s => !s)}>{t.pasteRoster}</button>
        </div>
        {team.players.length === 0 && <p className="hint-box">💡 {t.playersOptional}</p>}
        {showPaste && (
          <div className="paste">
            <p className="muted small">{t.pasteHint}</p>
            <textarea rows={8} value={paste} onChange={e => setPaste(e.target.value)} placeholder={'4 Matti Meikäläinen\n12 Ville Virtanen\n30 Pekka Pakkanen MV'} />
            <button type="button" className="primary" onClick={addPasted} disabled={!paste.trim()}>{t.addPlayers}</button>
          </div>
        )}
        <table className="roster">
          <thead><tr><th>{t.number}</th><th>{t.name}</th><th>{t.goalie}</th><th /></tr></thead>
          <tbody>
            {team.players.map(p => (
              <tr key={p.id}>
                <td><input className="num-input" inputMode="numeric" maxLength={3} value={p.number} onChange={e => setPlayer(p.id, { number: e.target.value.replace(/\D/g, '') })} /></td>
                <td><input value={p.name} onChange={e => setPlayer(p.id, { name: e.target.value })} /></td>
                <td><input type="checkbox" checked={p.goalie} onChange={e => setPlayer(p.id, { goalie: e.target.checked })} /></td>
                <td><button type="button" className="icon danger" onClick={() => setTeam(tm => ({ ...tm, players: tm.players.filter(x => x.id !== p.id) }))}>✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <button type="button" onClick={addPlayer}>+ {t.addPlayer}</button>
      </div>

      <div className="row between sticky-actions">
        {existing ? (
          <button type="button" className="danger" onClick={() => { if (confirm(t.confirmDeleteTeam)) { deleteTeam(team.id); go('teams'); } }}>{t.delete}</button>
        ) : <span />}
        <div className="row">
          <button type="button" onClick={() => go('teams')}>{t.cancel}</button>
          <button className="primary">{t.save}</button>
        </div>
      </div>
    </form>
  );
}
