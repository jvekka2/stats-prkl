import type { Shot, ShotResult } from '../types';

/** Rink geometry in feet (international-style drawing on a 200 x 85 ft surface). */
export const RINK_W = 200;
export const RINK_H = 85;
export const CORNER_R = 28;

const red = '#d7263d';
const blue = '#1f4fbf';
const circle = (cx: number, cy: number, r: number, stroke: string, w = 0.5, fill = 'none') =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" stroke="${stroke}" stroke-width="${w}" fill="${fill}"/>`;

function endZone(goalX: number, dir: 1 | -1) {
  const fx = goalX + dir * 20; // faceoff circles 20 ft out from goal line
  const crease = `<path d="M ${goalX} 36.5 A 6 6 0 0 ${dir > 0 ? 1 : 0} ${goalX} 48.5 Z" fill="#a9d3f5" stroke="${red}" stroke-width="0.3"/>`;
  const netX = dir > 0 ? goalX - 3.3 : goalX;
  const net = `<rect x="${netX}" y="39.5" width="3.3" height="6" fill="#fff" stroke="${red}" stroke-width="0.4"/>`;
  return [
    `<line x1="${goalX}" y1="0" x2="${goalX}" y2="${RINK_H}" stroke="${red}" stroke-width="0.4"/>`,
    crease, net,
    circle(fx, 20.5, 15, red), circle(fx, 64.5, 15, red),
    circle(fx, 20.5, 1, red, 0, red), circle(fx, 64.5, 1, red, 0, red)
  ].join('');
}

/** Static rink markings (inside a clip path shaped like the boards). */
export const RINK_MARKINGS = [
  `<rect x="0" y="0" width="${RINK_W}" height="${RINK_H}" fill="#f7fbff"/>`,
  `<line x1="100" y1="0" x2="100" y2="${RINK_H}" stroke="${red}" stroke-width="1"/>`,
  `<line x1="75" y1="0" x2="75" y2="${RINK_H}" stroke="${blue}" stroke-width="1"/>`,
  `<line x1="125" y1="0" x2="125" y2="${RINK_H}" stroke="${blue}" stroke-width="1"/>`,
  circle(100, 42.5, 15, blue),
  circle(100, 42.5, 0.8, blue, 0, blue),
  ...[80, 120].flatMap(x => [circle(x, 20.5, 1, red, 0, red), circle(x, 64.5, 1, red, 0, red)]),
  endZone(11, 1),
  endZone(189, -1)
].join('');

export const BOARDS = `<rect x="0" y="0" width="${RINK_W}" height="${RINK_H}" rx="${CORNER_R}" ry="${CORNER_R}" fill="none" stroke="#2b2f36" stroke-width="1.2"/>`;

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Is the point inside the rounded rink outline? */
export function insideRink(x: number, y: number): boolean {
  if (x < 0 || y < 0 || x > RINK_W || y > RINK_H) return false;
  const cx = clamp(x, CORNER_R, RINK_W - CORNER_R);
  const cy = clamp(y, CORNER_R, RINK_H - CORNER_R);
  return (x - cx) ** 2 + (y - cy) ** 2 <= CORNER_R ** 2;
}

/** SVG markup for one shot marker. Shape = result, fill = team color. */
export function shotMarker(s: Pick<Shot, 'x' | 'y' | 'result'>, color: string, scale = 1): string {
  const r = 1.9 * scale;
  const { x, y } = s;
  const stroke = `stroke="#111" stroke-width="${0.35 * scale}"`;
  switch (s.result as ShotResult) {
    case 'goal': {
      // Star
      const pts: string[] = [];
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const rr = i % 2 === 0 ? r * 1.6 : r * 0.7;
        pts.push(`${(x + rr * Math.cos(a)).toFixed(2)},${(y + rr * Math.sin(a)).toFixed(2)}`);
      }
      return `<polygon points="${pts.join(' ')}" fill="${color}" stroke="#111" stroke-width="${0.45 * scale}"/>`;
    }
    case 'save':
      return `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" ${stroke}/>`;
    case 'blocked':
      return `<rect x="${x - r * 0.85}" y="${y - r * 0.85}" width="${r * 1.7}" height="${r * 1.7}" transform="rotate(45 ${x} ${y})" fill="${color}" fill-opacity="0.55" ${stroke}/>`;
    case 'missed':
    default:
      return `<circle cx="${x}" cy="${y}" r="${r * 0.9}" fill="#fff" fill-opacity="0.6" stroke="${color}" stroke-width="${0.8 * scale}"/>`;
  }
}

/** Full standalone SVG (used for the share image). */
export function rinkSvg(shots: Shot[], colors: { home: string; away: string }, scale = 1): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 ${RINK_W + 2} ${RINK_H + 2}">
    <defs><clipPath id="rc"><rect x="0" y="0" width="${RINK_W}" height="${RINK_H}" rx="${CORNER_R}"/></clipPath></defs>
    <g clip-path="url(#rc)">${RINK_MARKINGS}</g>${BOARDS}
    ${shots.map(s => shotMarker(s, colors[s.team], scale)).join('')}
  </svg>`;
}

// ---------- Heatmap ----------

const RAMP: [number, number, number][] = [
  [0, 0, 255], [0, 200, 255], [0, 220, 90], [255, 230, 0], [255, 120, 0], [230, 0, 0]
];

function rampColor(t: number): [number, number, number] {
  const p = clamp(t, 0, 1) * (RAMP.length - 1);
  const i = Math.floor(p);
  const f = p - i;
  const a = RAMP[i], b = RAMP[Math.min(i + 1, RAMP.length - 1)];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}

/** Paint a density heatmap of shot locations onto a canvas sized to the rink aspect ratio. */
export function drawHeatmap(canvas: HTMLCanvasElement, shots: Pick<Shot, 'x' | 'y'>[], radiusFt = 9) {
  const w = canvas.width, h = canvas.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, w, h);
  if (!shots.length) return;

  const sx = w / RINK_W, sy = h / RINK_H;
  const r = radiusFt * sx;
  // Intensity per shot scales down a bit as shot count grows, so big samples don't saturate.
  const alpha = clamp(0.9 / Math.sqrt(Math.max(1, shots.length / 6)), 0.12, 0.6);

  const off = document.createElement('canvas');
  off.width = w; off.height = h;
  const o = off.getContext('2d')!;
  for (const s of shots) {
    const g = o.createRadialGradient(s.x * sx, s.y * sy, 0, s.x * sx, s.y * sy, r);
    g.addColorStop(0, `rgba(0,0,0,${alpha})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    o.fillStyle = g;
    o.fillRect(s.x * sx - r, s.y * sy - r, r * 2, r * 2);
  }
  const img = o.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3] / 255;
    if (a < 0.02) { d[i + 3] = 0; continue; }
    const [cr, cg, cb] = rampColor(a);
    d[i] = cr; d[i + 1] = cg; d[i + 2] = cb;
    d[i + 3] = Math.round(clamp(a * 1.6, 0.25, 0.85) * 255);
  }
  ctx.putImageData(img, 0, 0);
  // Clip to rink outline.
  ctx.globalCompositeOperation = 'destination-in';
  ctx.beginPath();
  ctx.roundRect(0, 0, w, h, CORNER_R * sx);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
}
