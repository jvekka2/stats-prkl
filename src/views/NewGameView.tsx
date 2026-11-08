import { useState } from 'react';
import type { GameFormat, Side, Team } from '../types';
import { saveGame, saveTeam, uid, useData } from '../lib/store';
import { go } from '../lib/router';
import { useT } from '../lib/i18n';
import { playerLabel, sortPlayers } from '../lib/roster';
import { createGame, loadFormat, rememberFormat, snapTeam, today } from '../lib/game';
import { placeholderPlayers } from '../lib/demo';

interface SideSetup { teamId: string; dressed: Set<string>; goalieId: string | null }

const setupFor = (team: Team | undefined): SideSetup => ({
  teamId: team?.id ?? '',
  dressed: new Set(team?.players.map(p => p.id) ?? []),
  goalieId: team?.players.find(p => p.goalie)?.id ?? null
});

export default function NewGameView() {
  const { teams } = useData();
  const t = useT();
  const [date, setDate] = useState(today);
  const [venue, setVenue] = useState('');
  const [format, setFormat] = useState<GameFormat>(loadFormat);
  const [sides, setSides] = useState<Record<Side, SideSetup>>({ home: setupFor(undefined), away: setupFor(undefined) });
  const [error, setError] = useState('');

  const teamById = (id: string) => teams.find(x => x.id === id);
  const sortedTeams = [...teams].sort((a, b) => a.name.localeCompare(b.name));

  const pickTeam = (side: Side, id: string) => {
    let team = teamById(id);
    // Players are optional: a team without a roster gets numbered placeholder players.
    if (team && team.players.length === 0) {
      team = { ...team, players: placeholderPlayers(uid, t.goalie) };
      saveTeam(team);
    }
    setSides(s => ({ ...s, [side]: setupFor(team) }));
  };
  const toggle = (side: Side, pid: string) => setSides(s => {
    const dressed = new Set(s[side].dressed);
    if (dressed.has(pid)) dressed.delete(pid); else dressed.add(pid);
    return { ...s, [side]: { ...s[side], dressed } };
  });

  const f = (patch: Partial<GameFormat>) => setFormat(x => ({ ...x, ...patch }));

  function start() {
    const h = teamById(sides.home.teamId), a = teamById(sides.away.teamId);
    if (!h || !a || h.id === a.id) { setError(t.needTwoTeams); return; }
    const game = createGame(uid(), snapTeam(h, sides.home.dressed, sides.home.goalieId), snapTeam(a, sides.away.dressed, sides.away.goalieId), format, date, venue.trim());
    rememberFormat(format);
    saveGame(game);
    go('live', game.id);
  }

  const sideCard = (side: Side) => {
    const s = sides[side];
    const team = teamById(s.teamId);
    const players = team ? sortPlayers(team.players) : [];
    const goalies = players.filter(p => p.goalie && s.dressed.has(p.id));
    return (
      <div className="card" style={team ? { borderTop: `4px solid ${team.color}` } : undefined}>
        <h2>{side === 'home' ? t.homeTeam : t.awayTeam}</h2>
        <select value={s.teamId} onChange={e => pickTeam(side, e.target.value)}>
          <option value="">{t.selectTeam}</option>
          {sortedTeams.map(tm => <option key={tm.id} value={tm.id}>{tm.name}</option>)}
        </select>
        {team && (
          <>
            <label className="mt">{t.startingGoalie}
              <select value={s.goalieId ?? ''} onChange={e => setSides(x => ({ ...x, [side]: { ...x[side], goalieId: e.target.value || null } }))}>
                <option value="">{t.emptyNet}</option>
                {goalies.map(p => <option key={p.id} value={p.id}>{playerLabel(p)}</option>)}
              </select>
            </label>
            <div className="small muted mt">{t.dressed} ({s.dressed.size}/{players.length})</div>
            <div className="chips">
              {players.map(p => (
                <button type="button" key={p.id} className={'chip' + (s.dressed.has(p.id) ? ' on' : '')} onClick={() => toggle(side, p.id)}>
                  {p.number || '?'} {p.name.split(' ').slice(-1)[0]}{p.goalie ? ' 🧤' : ''}
                </button>
              ))}
            </div>
            <button type="button" className="link" onClick={() => go('team', team.id)}>{t.editTeam}</button>
          </>
        )}
      </div>
    );
  };

  return (
    <>
      <h1>{t.newGame}</h1>
      {teams.length < 2 && (
        <p className="empty">{t.noTeams} <button className="primary" onClick={() => go('team', 'new')}>+ {t.addTeam}</button></p>
      )}
      <div className="grid2">
        {sideCard('home')}
        {sideCard('away')}
      </div>
      <div className="card">
        <div className="row wrap">
          <label>{t.date}<input type="date" value={date} onChange={e => setDate(e.target.value)} /></label>
          <label className="grow">{t.venue}<input value={venue} onChange={e => setVenue(e.target.value)} /></label>
        </div>
      </div>
      <div className="card">
        <h2>{t.format}</h2>
        <div className="row wrap">
          <label>{t.periods}
            <select value={format.periods} onChange={e => f({ periods: Number(e.target.value) })}>
              {[1, 2, 3, 4].map(n => <option key={n}>{n}</option>)}
            </select>
          </label>
          <label>{t.periodMinutes}
            <input type="number" min={1} max={60} value={format.periodMinutes} onChange={e => f({ periodMinutes: Math.max(1, Number(e.target.value) || 1) })} />
          </label>
          <label>{t.clockMode}
            <select value={format.clockMode} onChange={e => f({ clockMode: e.target.value as GameFormat['clockMode'] })}>
              <option value="stop">{t.clockStop}</option>
              <option value="running">{t.clockRunning}</option>
            </select>
          </label>
        </div>
        <div className="row wrap mt">
          <label className="check"><input type="checkbox" checked={format.overtime} onChange={e => f({ overtime: e.target.checked })} /> {t.overtime}</label>
          {format.overtime && (
            <label>{t.overtimeMinutes}
              <input type="number" min={1} max={20} value={format.overtimeMinutes} onChange={e => f({ overtimeMinutes: Math.max(1, Number(e.target.value) || 1) })} />
            </label>
          )}
          <label className="check"><input type="checkbox" checked={format.shootout} onChange={e => f({ shootout: e.target.checked })} /> {t.shootout}</label>
        </div>
      </div>
      {error && <p className="error">{error}</p>}
      <button className="primary big full" onClick={start}>{t.startGame} ▶</button>
    </>
  );
}
