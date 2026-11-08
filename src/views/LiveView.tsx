import { useEffect, useState } from 'react';
import type { Game, Shot, Side } from '../types';
import { updateGame, uid, useData } from '../lib/store';
import { go } from '../lib/router';
import { useT } from '../lib/i18n';
import * as C from '../lib/clock';
import { isOnGoal, other, score } from '../lib/stats';
import { playerLabel } from '../lib/roster';
import Rink from '../components/Rink';
import ShotDialog, { type ShotDraft } from '../components/ShotDialog';
import ShootoutPanel from '../components/ShootoutPanel';

function useTick(active: boolean) {
  const [, setN] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setN(n => n + 1), 250);
    return () => clearInterval(id);
  }, [active]);
}

/** Keep the phone screen on while tracking. */
function useWakeLock() {
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const req = async () => {
      try { lock = await (navigator as any).wakeLock?.request('screen'); } catch { /* not supported / denied */ }
    };
    req();
    const onVis = () => { if (document.visibilityState === 'visible') req(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { document.removeEventListener('visibilitychange', onVis); lock?.release().catch(() => undefined); };
  }, []);
}

export default function LiveView({ gameId }: { gameId: string }) {
  const { games } = useData();
  const game = games.find(g => g.id === gameId);
  if (!game) return <div className="content"><p className="empty">404</p><button onClick={() => go('games')}>←</button></div>;
  return <Live game={game} />;
}

function Live({ game }: { game: Game }) {
  const t = useT();
  const [draft, setDraft] = useState<ShotDraft | null>(null);
  const [menu, setMenu] = useState(false);
  const [lastId, setLastId] = useState<string | null>(null);
  const { format, clock } = game;
  const running = clock.runningSince != null;
  useTick(running);
  useWakeLock();

  const remaining = C.remaining(clock, format);
  const elapsed = C.elapsed(clock, format);
  const periodOver = remaining <= 0;
  const isLast = clock.period >= C.lastPeriod(format);
  const sc = score(game);
  const sog = { home: 0, away: 0 };
  game.shots.forEach(s => { if (isOnGoal(s.result)) sog[s.team]++; });

  const upd = (fn: (g: Game) => Game) => updateGame(game.id, fn);

  // Auto-stop at 0:00.
  useEffect(() => {
    if (running && periodOver) upd(g => ({ ...g, clock: C.stop(g.clock, g.format) }));
  });

  const toggleClock = () => upd(g => ({ ...g, clock: g.clock.runningSince != null ? C.stop(g.clock, g.format) : C.start(g.clock) }));

  const onTap = (x: number, y: number) => {
    // Fixed sides: home attacks right, so a tap on the right half is a home shot.
    const team: Side = x >= 100 ? 'home' : 'away';
    setDraft({ team, x, y, period: clock.period, timeMs: elapsed });
  };

  const saveShot = (s: Omit<Shot, 'id' | 'createdAt' | 'goalieId'> & { id?: string }) => {
    upd(g => {
      if (s.id) {
        return {
          ...g,
          shots: g.shots.map(x => (x.id === s.id
            ? { ...x, ...s, id: x.id, goalieId: x.team === s.team ? x.goalieId : g[other(s.team)].goalieId }
            : x))
        };
      }
      const shot: Shot = { ...s, id: uid(), createdAt: Date.now(), goalieId: g[other(s.team)].goalieId };
      setLastId(shot.id);
      return { ...g, shots: [...g.shots, shot] };
    });
    setDraft(null);
  };

  const undo = () => {
    const last = game.shots[game.shots.length - 1];
    if (last) upd(g => ({ ...g, shots: g.shots.slice(0, -1) }));
    setLastId(null);
  };

  const nextPeriod = () => upd(g => ({ ...g, clock: C.nextPeriod(C.stop(g.clock, g.format)) }));
  const endGame = () => {
    if (!confirm(t.confirmEndGame)) return;
    upd(g => ({ ...g, status: 'final', clock: C.stop(g.clock, g.format) }));
    go('results', game.id);
  };
  const toShootout = () => { upd(g => ({ ...g, status: 'shootout', clock: C.stop(g.clock, g.format) })); setMenu(false); };

  const teamBox = (side: Side) => (
    <div className={`team-box ${side}`} style={{ borderColor: game[side].color }}>
      <span className="abbr">{game[side].shortName}</span>
      <span className="big-score">{sc[side]}</span>
      <span className="sog">{t.colSog} {sog[side]}</span>
    </div>
  );

  return (
    <div className="live">
      <div className="live-bar">
        <button className="icon" onClick={() => setMenu(true)} aria-label={t.menu}>☰</button>
        {teamBox('away')}
        <div className="clock-box">
          <div className="period">{game.status === 'shootout' ? t.so : `${t.period} ${C.periodLabel(clock.period, format, t.ot)}`}</div>
          <div className={'clock' + (running ? ' running' : '') + (periodOver ? ' over' : '')}>{C.formatMs(remaining)}</div>
        </div>
        {game.status === 'live' && (
          <button className={'clock-btn' + (running ? ' stop' : '')} onClick={toggleClock} disabled={periodOver && !running}>
            {running ? '❚❚' : '▶'}
          </button>
        )}
        {teamBox('home')}
        <button className="icon" onClick={undo} disabled={!game.shots.length || game.status !== 'live'} aria-label={t.undo}>↶</button>
      </div>

      {game.status === 'shootout' ? (
        <ShootoutPanel game={game} onEnd={() => { upd(g => ({ ...g, status: 'final' })); go('results', game.id); }} />
      ) : (
        <div className="live-rink">
          <Rink
            shots={game.shots.filter(s => s.period === clock.period)}
            colors={{ home: game.home.color, away: game.away.color }}
            onTap={onTap}
            onShotTap={s => setDraft({ team: s.team, x: s.x, y: s.y, period: s.period, timeMs: s.timeMs, existing: s })}
            highlightId={lastId}
            labels={{ left: `◀ ${game.away.shortName}`, right: `${game.home.shortName} ▶` }}
          />
          {periodOver && (
            <div className="period-over">
              <b>{t.periodOver}</b>
              {!isLast && <button className="primary" onClick={nextPeriod}>{t.nextPeriod} ▶</button>}
              {isLast && format.shootout && sc.home === sc.away && <button className="primary" onClick={toShootout}>{t.toShootout}</button>}
              {(isLast || clock.period >= format.periods) && <button onClick={endGame}>{t.endGame}</button>}
            </div>
          )}
          {!game.shots.length && !periodOver && <div className="hint">{t.tapRinkHint}</div>}
          <div className="rotate-hint">{t.rotateHint}</div>
        </div>
      )}

      {draft && (
        <ShotDialog
          game={game}
          draft={draft}
          onSave={saveShot}
          onDelete={() => { upd(g => ({ ...g, shots: g.shots.filter(s => s.id !== draft.existing?.id) })); setDraft(null); }}
          onClose={() => setDraft(null)}
        />
      )}

      {menu && <LiveMenu game={game} onClose={() => setMenu(false)} upd={upd} onNext={nextPeriod} onEnd={endGame} onShootout={toShootout} />}
    </div>
  );
}

function LiveMenu({ game, onClose, upd, onNext, onEnd, onShootout }: {
  game: Game; onClose: () => void; upd: (fn: (g: Game) => Game) => void;
  onNext: () => void; onEnd: () => void; onShootout: () => void;
}) {
  const t = useT();
  const [clockText, setClockText] = useState(C.formatMs(C.remaining(game.clock, game.format)));
  const isLast = game.clock.period >= C.lastPeriod(game.format);

  const applyClock = () => {
    const ms = C.parseClock(clockText);
    if (ms != null) upd(g => ({ ...g, clock: C.setRemaining(g.clock, g.format, ms) }));
  };

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog menu" onClick={e => e.stopPropagation()}>
        <div className="dlg-head"><b>{t.menu}</b><span className="grow" /><button className="icon" onClick={onClose}>✕</button></div>
        <div className="menu-grid">
          <div>
            <label>{t.editClock}
              <div className="row">
                <input value={clockText} onChange={e => setClockText(e.target.value)} inputMode="numeric" size={6} />
                <button onClick={() => { applyClock(); onClose(); }}>{t.save}</button>
              </div>
            </label>
            {(['home', 'away'] as Side[]).map(side => (
              <label key={side}>{t.changeGoalie}: {game[side].shortName}
                <select value={game[side].goalieId ?? ''} onChange={e => upd(g => ({ ...g, [side]: { ...g[side], goalieId: e.target.value || null } }))}>
                  <option value="">{t.emptyNet}</option>
                  {game[side].players.filter(p => p.goalie).map(p => <option key={p.id} value={p.id}>{playerLabel(p)}</option>)}
                </select>
              </label>
            ))}
          </div>
          <div className="menu-actions">
            {game.status === 'live' && game.clock.period > 1 && (
              <button onClick={() => { upd(g => ({ ...g, clock: C.prevPeriod(C.stop(g.clock, g.format)) })); onClose(); }}>◀ {t.prevPeriod}</button>
            )}
            {game.status === 'live' && !isLast && <button onClick={() => { onNext(); onClose(); }}>{t.nextPeriod} ▶</button>}
            {game.status === 'live' && game.format.shootout && <button onClick={onShootout}>{t.toShootout}</button>}
            {game.status === 'shootout' && <button onClick={() => { upd(g => ({ ...g, status: 'live' })); onClose(); }}>◀ {t.back}</button>}
            <button onClick={() => go('results', game.id)}>📊 {t.results}</button>
            <button className="primary" onClick={onEnd}>{t.endGame}</button>
            <button onClick={() => go('games')}>← {t.games}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
