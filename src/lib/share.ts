import type { Game, Side } from '../types';
import type { Dict } from './i18n';
import { byPeriod, finalScore, goalieLines, skaterLines, svPct } from './stats';
import { formatElapsed, isOvertime, periodLabel } from './clock';
import { shortName } from './roster';
import { rinkSvg } from './rink';

const findPlayer = (game: Game, side: Side, id: string | null) => game[side].players.find(p => p.id === id) ?? null;

export function formatDate(iso: string, lang: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return lang === 'fi' ? `${d}.${m}.${y}` : new Date(y, m - 1, d).toLocaleDateString('en-GB');
}

function suffix(game: Game, t: Dict) {
  const s = finalScore(game);
  if (s.shootoutWinner) return ` (${t.so})`;
  if (game.shots.some(x => x.result === 'goal' && isOvertime(x.period, game.format))) return ` (${t.ot})`;
  return '';
}

/** WhatsApp-friendly plain text summary. *bold* and _italic_ use WhatsApp markup. */
export function summaryText(game: Game, t: Dict, lang: string): string {
  const s = finalScore(game);
  const rows = byPeriod(game);
  const L: string[] = [];
  L.push(`🏒 *${game.home.name} ${s.home}–${s.away} ${game.away.name}*${suffix(game, t)}`);
  L.push(`📅 ${formatDate(game.date, lang)}${game.venue ? ' · ' + game.venue : ''}`);
  L.push(`${t.byPeriod}: ${rows.map(r => `${r.home.goals}–${r.away.goals}`).join(', ')}`);
  const sogH = rows.reduce((n, r) => n + r.home.onGoal, 0), sogA = rows.reduce((n, r) => n + r.away.onGoal, 0);
  L.push(`🎯 ${t.shotsOnGoal}: *${sogH}–${sogA}* (${rows.map(r => `${r.home.onGoal}–${r.away.onGoal}`).join(', ')})`);
  const attH = rows.reduce((n, r) => n + r.home.attempts, 0), attA = rows.reduce((n, r) => n + r.away.attempts, 0);
  L.push(`${t.attempts}: ${attH}–${attA}`);

  const goals = game.shots.filter(x => x.result === 'goal').sort((a, b) => a.period - b.period || a.timeMs - b.timeMs);
  if (goals.length) {
    L.push('', `🚨 *${t.goalScorers}*`);
    let h = 0, a = 0;
    for (const g of goals) {
      if (g.team === 'home') h++; else a++;
      const scorer = shortName(findPlayer(game, g.team, g.shooterId), t.unknown);
      const ast = g.assists.map(id => shortName(findPlayer(game, g.team, id))).join(', ');
      L.push(`${h}–${a} ${periodLabel(g.period, game.format, t.ot)}/${formatElapsed(g.timeMs)} ${game[g.team].shortName} ${scorer}${ast ? ` (${ast})` : ''}`);
    }
  }

  L.push('', `🔥 *${t.topShooters}*`);
  for (const side of ['home', 'away'] as Side[]) {
    const top = skaterLines(game, side).filter(l => l.player && l.onGoal > 0).sort((a, b) => b.onGoal - a.onGoal).slice(0, 3);
    L.push(`${game[side].shortName}: ${top.length ? top.map(l => `${shortName(l.player)} ${l.onGoal}`).join(', ') : '–'}`);
  }

  L.push('', `🧤 *${t.goaliesShort}*`);
  for (const side of ['home', 'away'] as Side[]) {
    for (const gl of goalieLines(game, side)) {
      L.push(`${game[side].shortName} ${shortName(gl.player)}: ${gl.saves}/${gl.shotsAgainst} ${t.colSvPct} ${svPct(gl.svPct)}`);
    }
  }

  if (game.shootout.length) {
    L.push('', `🎯 ${t.shootoutAttempts}: ${game.shootout.map(x => `${game[x.team].shortName} ${shortName(findPlayer(game, x.team, x.shooterId), '?')} ${x.scored ? '✅' : '❌'}`).join(', ')}`);
  }

  L.push('', `_${t.trackedWith}_`);
  return L.join('\n');
}

// ---------- Result card image ----------

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxW: number, font: (px: number) => string, start: number) {
  let px = start;
  ctx.font = font(px);
  while (px > 12 && ctx.measureText(text).width > maxW) { px -= 2; ctx.font = font(px); }
  return px;
}

/** Draw a 1080x1350 result card (Instagram/WhatsApp friendly portrait) and return a PNG blob. */
export async function resultCard(game: Game, t: Dict, lang: string): Promise<Blob> {
  const W = 1080, H = 1350, P = 60;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d')!;
  const font = (w: string) => (px: number) => `${w} ${px}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
  const s = finalScore(game);
  const rows = byPeriod(game);

  // Background
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#0d1424'); bg.addColorStop(1, '#162238');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = game.home.color; ctx.fillRect(0, 0, W / 2, 14);
  ctx.fillStyle = game.away.color; ctx.fillRect(W / 2, 0, W / 2, 14);

  ctx.fillStyle = '#9fb0cc'; ctx.textAlign = 'center';
  ctx.font = font('500')(30);
  ctx.fillText(`${formatDate(game.date, lang)}${game.venue ? ' · ' + game.venue : ''}`, W / 2, 80);

  // Team names
  ctx.fillStyle = '#fff';
  for (const [side, x] of [['home', W * 0.25], ['away', W * 0.75]] as [Side, number][]) {
    fitText(ctx, game[side].name, W / 2 - P, font('700'), 46);
    ctx.fillText(game[side].name, x, 160);
  }
  // Score
  ctx.font = font('800')(180);
  ctx.fillText(`${s.home} – ${s.away}`, W / 2, 340);
  const suf = suffix(game, t).trim();
  if (suf) { ctx.font = font('600')(36); ctx.fillStyle = '#9fb0cc'; ctx.fillText(suf, W / 2, 390); }

  // Shots by period table
  let y = 450;
  ctx.font = font('600')(30); ctx.fillStyle = '#9fb0cc';
  const cols = rows.length + 1;
  const colW = (W - 2 * P - 260) / cols;
  ctx.textAlign = 'left'; ctx.fillText(t.shotsOnGoal, P, y);
  y += 44;
  ctx.font = font('500')(26);
  ctx.textAlign = 'center';
  rows.forEach((r, i) => ctx.fillText(periodLabel(r.period, game.format, t.ot), P + 260 + colW * (i + 0.5), y));
  ctx.fillText(t.total, P + 260 + colW * (cols - 0.5), y);
  for (const side of ['home', 'away'] as Side[]) {
    y += 52;
    ctx.textAlign = 'left'; ctx.fillStyle = game[side].color;
    ctx.fillRect(P, y - 26, 10, 32);
    ctx.fillStyle = '#fff'; ctx.font = font('700')(34);
    ctx.fillText(game[side].shortName, P + 24, y);
    ctx.textAlign = 'center'; ctx.font = font('500')(34);
    rows.forEach((r, i) => ctx.fillText(String(r[side].onGoal), P + 260 + colW * (i + 0.5), y));
    ctx.font = font('800')(36);
    ctx.fillText(String(rows.reduce((n, r) => n + r[side].onGoal, 0)), P + 260 + colW * (cols - 0.5), y);
  }

  // Rink with shot markers
  y += 40;
  const rinkW = W - 2 * P, rinkH = rinkW * 87 / 202;
  const svg = rinkSvg(game.shots, { home: game.home.color, away: game.away.color }, 1.15);
  try {
    const img = await loadImage('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg));
    ctx.drawImage(img, P, y, rinkW, rinkH);
  } catch { /* skip rink if SVG rendering fails */ }
  y += rinkH + 50;

  // Goals
  const goals = game.shots.filter(x => x.result === 'goal').sort((a, b) => a.period - b.period || a.timeMs - b.timeMs);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#9fb0cc'; ctx.font = font('600')(28);
  ctx.fillText(`🚨 ${t.goalScorers}`, P, y);
  ctx.fillText(`🧤 ${t.goaliesShort}`, W / 2 + 20, y);
  ctx.font = font('500')(26); ctx.fillStyle = '#fff';
  let gy = y + 40;
  const maxGoals = Math.floor((H - 70 - gy) / 34);
  goals.slice(0, maxGoals).forEach(g => {
    const txt = `${periodLabel(g.period, game.format, t.ot)}/${formatElapsed(g.timeMs)} ${game[g.team].shortName} ${shortName(findPlayer(game, g.team, g.shooterId), '?')}`;
    fitText(ctx, txt, W / 2 - P - 20, font('500'), 26);
    ctx.fillText(txt, P, gy);
    gy += 34;
  });
  if (goals.length > maxGoals) ctx.fillText(`+${goals.length - maxGoals}…`, P, gy);

  let ry = y + 40;
  ctx.font = font('500')(26);
  for (const side of ['home', 'away'] as Side[]) {
    for (const gl of goalieLines(game, side)) {
      const txt = `${game[side].shortName} ${shortName(gl.player)} ${gl.saves}/${gl.shotsAgainst} (${svPct(gl.svPct)})`;
      fitText(ctx, txt, W / 2 - P - 20, font('500'), 26);
      ctx.fillText(txt, W / 2 + 20, ry);
      ry += 34;
    }
  }

  ctx.textAlign = 'center'; ctx.fillStyle = '#5f7090'; ctx.font = font('500')(24);
  ctx.fillText(`🏒 ${t.trackedWith}`, W / 2, H - 30);

  return new Promise((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error('toBlob failed'))), 'image/png'));
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers / non-secure contexts
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export async function shareImage(blob: Blob, filename: string, title: string) {
  const file = new File([blob], filename, { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try { await nav.share({ files: [file], title }); return; } catch (e) {
      if ((e as Error).name === 'AbortError') return;
    }
  }
  downloadBlob(blob, filename);
}
