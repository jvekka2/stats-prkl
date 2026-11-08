import { go } from '../lib/router';
import { useData } from '../lib/store';
import { useT } from '../lib/i18n';

export default function TeamsView() {
  const { teams } = useData();
  const t = useT();
  const sorted = [...teams].sort((a, b) => a.name.localeCompare(b.name));
  return (
    <>
      <div className="row between">
        <h1>{t.teams}</h1>
        <button className="primary" onClick={() => go('team', 'new')}>+ {t.addTeam}</button>
      </div>
      {sorted.length === 0 && <p className="empty">{t.noTeams}</p>}
      <div className="list">
        {sorted.map(team => (
          <button key={team.id} className="list-item" onClick={() => go('team', team.id)}>
            <span className="swatch" style={{ background: team.color }} />
            <span className="grow">
              <b>{team.name}</b> <span className="muted">{team.shortName}</span>
            </span>
            <span className="muted">
              {team.players.filter(p => !p.goalie).length} + {team.players.filter(p => p.goalie).length} {t.goalie}
            </span>
          </button>
        ))}
      </div>
    </>
  );
}
