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
  const font = (w: string) => (px: number) => `${w} ${px}px "Work Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
  const disp = () => (px: number) => `400 ${px}px "Bebas Neue", "Arial Narrow", sans-serif`;
  await document.fonts?.ready;
  const s = finalScore(game);
  const rows = byPeriod(game);

  // Background
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#161616'); bg.addColorStop(1, '#000000');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#f08015'; ctx.fillRect(0, 0, W, 18);
  ctx.fillStyle = game.home.color; ctx.fillRect(0, 18, W / 2, 8);
  ctx.fillStyle = game.away.color; ctx.fillRect(W / 2, 18, W / 2, 8);
  ctx.fillStyle = '#f08015'; ctx.fillRect(0, H - 8, W, 8);

  ctx.fillStyle = '#bdbdbd'; ctx.textAlign = 'center';
  ctx.font = font('500')(30);
  ctx.fillText(`${formatDate(game.date, lang)}${game.venue ? ' · ' + game.venue : ''}`, W / 2, 80);

  // Team names
  ctx.fillStyle = '#fff';
  for (const [side, x] of [['home', W * 0.25], ['away', W * 0.75]] as [Side, number][]) {
    fitText(ctx, game[side].name.toUpperCase(), W / 2 - P, disp(), 64);
    ctx.fillText(game[side].name.toUpperCase(), x, 165);
  }
  // Logos beside the score
  for (const [side, cx] of [['home', 140], ['away', W - 140]] as [Side, number][]) {
    const src = game[side].logo;
    if (!src) continue;
    try {
      const img = await loadImage(src);
      const k = Math.min(150 / img.naturalWidth, 150 / img.naturalHeight) || 1;
      const w = img.naturalWidth * k, h = img.naturalHeight * k;
      ctx.drawImage(img, cx - w / 2, 270 - h / 2, w, h);
    } catch { /* ignore broken logo */ }
  }
  // Score
  ctx.fillStyle = '#fff';
  ctx.font = disp()(230);
  ctx.fillText(`${s.home} – ${s.away}`, W / 2, 345);
  const suf = suffix(game, t).trim();
  if (suf) { ctx.font = disp()(44); ctx.fillStyle = '#f08015'; ctx.fillText(suf, W / 2, 395); }

  // Shots by period table
  let y = 450;
  ctx.font = disp()(40); ctx.fillStyle = '#f08015';
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
  const svg = rinkSvg(game.shots, { home: game.home.color, away: game.away.color }, 1.15, { home: game.home.logo, away: game.away.logo });
  try {
    const img = await loadImage('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg));
    ctx.drawImage(img, P, y, rinkW, rinkH);
  } catch { /* skip rink if SVG rendering fails */ }
  y += rinkH + 50;

  // Goals
  const goals = game.shots.filter(x => x.result === 'goal').sort((a, b) => a.period - b.period || a.timeMs - b.timeMs);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#f08015'; ctx.font = disp()(38);
  ctx.fillText(t.goalScorers.toUpperCase(), P, y);
  ctx.fillText(t.goaliesShort.toUpperCase(), W / 2 + 20, y);
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

  ctx.textAlign = 'center'; ctx.fillStyle = '#8a8a8a'; ctx.font = font('500')(24);
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
