import { useState } from 'react';
import type { Game, Player, Shot, ShotResult, Side } from '../types';
import { SHOT_RESULTS } from '../types';
import { useT } from '../lib/i18n';
import { other } from '../lib/stats';
import { formatElapsed, periodLabel } from '../lib/clock';

export interface ShotDraft {
  team: Side;
  x: number;
  y: number;
  period: number;
  timeMs: number;
  existing?: Shot;
}

interface Props {
  game: Game;
  draft: ShotDraft;
  onSave: (shot: Omit<Shot, 'id' | 'createdAt' | 'goalieId'> & { id?: string }) => void;
  onDelete?: () => void;
  onClose: () => void;
}

const UNKNOWN = '__unknown__';

function PlayerGrid({ players, selected, onPick, extra }: {
  players: Player[]; selected: string[]; onPick: (id: string) => void; extra?: { id: string; label: string };
}) {
  return (
    <div className="player-grid">
      {players.map(p => (
        <button key={p.id} type="button" className={'num-btn' + (selected.includes(p.id) ? ' on' : '')} onClick={() => onPick(p.id)}>
          <span className="n">{p.number || '?'}</span>
          <span className="nm">{p.name.split(' ').slice(-1)[0]}</span>
        </button>
      ))}
      {extra && (
        <button type="button" className={'num-btn unknown' + (selected.includes(extra.id) ? ' on' : '')} onClick={() => onPick(extra.id)}>
          <span className="n">?</span><span className="nm">{extra.label}</span>
        </button>
      )}
    </div>
  );
}

export default function ShotDialog({ game, draft, onSave, onDelete, onClose }: Props) {
  const t = useT();
  const ex = draft.existing;
  const [team, setTeam] = useState<Side>(ex?.team ?? draft.team);
  const [shooter, setShooter] = useState<string | null>(ex ? ex.shooterId ?? UNKNOWN : null);
  const [result, setResult] = useState<ShotResult | null>(ex?.result ?? null);
  const [assists, setAssists] = useState<string[]>(ex?.assists ?? []);
  const [step, setStep] = useState<'main' | 'assists'>('main');

  const gt = game[team];
  const skaters = gt.players.filter(p => !p.goalie);
  const labels: Record<ShotResult, string> = { goal: t.goal, save: t.save_, blocked: t.blocked, missed: t.missed };

  const commit = (r: ShotResult, s: string | null, a: string[]) => {
    onSave({
      id: ex?.id, team, shooterId: s === UNKNOWN ? null : s, result: r,
      x: draft.x, y: draft.y, period: ex?.period ?? draft.period, timeMs: ex?.timeMs ?? draft.timeMs,
      assists: r === 'goal' ? a.filter(id => id !== s).slice(0, 2) : []
    });
  };

  // Fast path for new shots: as soon as both shooter and result are known, save (or ask assists for goals).
  const advance = (s: string | null, r: ShotResult | null) => {
    if (ex || !s || !r) return;
    if (r === 'goal') setStep('assists');
    else commit(r, s, []);
  };

  const pickShooter = (id: string) => { setShooter(id); advance(id, result); };
  const pickResult = (r: ShotResult) => { setResult(r); advance(shooter, r); };

  const switchTeam = () => {
    setTeam(other(team));
    setShooter(null);
    setAssists([]);
  };

  const toggleAssist = (id: string) =>
    setAssists(a => (a.includes(id) ? a.filter(x => x !== id) : a.length >= 2 ? [a[0], id] : [...a, id]));

  const header = (
    <div className="dlg-head" style={{ borderColor: gt.color }}>
      <span className="swatch" style={{ background: gt.color }} />
      <b>{gt.name}</b>
      <span className="muted small">{t.period} {periodLabel(draft.period, game.format, t.ot)} · {formatElapsed(ex?.timeMs ?? draft.timeMs)}</span>
      <span className="grow" />
      {step === 'main' && <button type="button" onClick={switchTeam}>⇄ {t.switchTeam}</button>}
      <button type="button" className="icon" onClick={onClose} aria-label={t.cancel}>✕</button>
    </div>
  );

  if (step === 'assists') {
    const mates = gt.players.filter(p => p.id !== shooter);
    return (
      <div className="dialog-backdrop" onClick={onClose}>
        <div className="dialog" onClick={e => e.stopPropagation()}>
          {header}
          <div className="dlg-title">🚨 {t.assists}</div>
          <PlayerGrid players={mates} selected={assists} onPick={toggleAssist} />
          <div className="row end mt">
            <button type="button" onClick={() => commit('goal', shooter, [])}>{t.noAssist}</button>
            <button type="button" className="primary" onClick={() => commit('goal', shooter, assists)}>
              {t.done}{assists.length ? ` (${assists.length})` : ''}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog" onClick={e => e.stopPropagation()}>
        {header}
        <div className="dlg-body">
          <div className="dlg-players">
            <div className="small muted">{t.shooter}</div>
            <PlayerGrid players={skaters} selected={shooter ? [shooter] : []} onPick={pickShooter} extra={{ id: UNKNOWN, label: t.unknown }} />
          </div>
          <div className="dlg-results">
            {SHOT_RESULTS.map(r => (
              <button key={r} type="button" className={`result-btn r-${r}` + (result === r ? ' on' : '')} onClick={() => pickResult(r)}>
                {labels[r]}
              </button>
            ))}
          </div>
        </div>
        {ex && (
          <div className="row between mt">
            <button type="button" className="danger" onClick={onDelete}>🗑 {t.deleteShot}</button>
            <div className="row">
              {result === 'goal' && <button type="button" onClick={() => setStep('assists')}>{t.assists} ({assists.length})</button>}
              <button type="button" className="primary" disabled={!shooter || !result} onClick={() => result && commit(result, shooter, assists)}>{t.save}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
