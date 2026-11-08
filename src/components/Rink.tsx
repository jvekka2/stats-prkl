import { useMemo, useRef, type MouseEvent, type ReactNode } from 'react';
import type { Shot } from '../types';
import { BOARDS, CORNER_R, RINK_H, RINK_MARKINGS, RINK_W, drawHeatmap, insideRink, shotMarker } from '../lib/rink';

interface Props {
  shots: Shot[];
  colors: { home: string; away: string };
  mode?: 'dots' | 'heat';
  onTap?: (x: number, y: number) => void;
  onShotTap?: (shot: Shot) => void;
  highlightId?: string | null;
  overlay?: ReactNode;
  labels?: { left: string; right: string };
  /** Team logos drawn faintly in the background: away on the left half, home on the right. */
  logos?: { home?: string; away?: string };
}

export default function Rink({ shots: allShots, colors, mode = 'dots', onTap, onShotTap, highlightId, overlay, labels, logos }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const shots = useMemo(() => allShots.filter(s => !s.noLocation), [allShots]);
  const heatUrl = useMemo(() => {
    if (mode !== 'heat') return null;
    const c = document.createElement('canvas');
    c.width = 1000; c.height = Math.round(1000 * RINK_H / RINK_W);
    drawHeatmap(c, shots);
    return c.toDataURL();
  }, [shots, mode]);

  function handleClick(e: MouseEvent<SVGSVGElement>) {
    if (!onTap || !svgRef.current) return;
    const ctm = svgRef.current.getScreenCTM();
    if (!ctm) return;
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    if (!insideRink(pt.x, pt.y)) return;
    onTap(Math.round(pt.x * 10) / 10, Math.round(pt.y * 10) / 10);
  }

  return (
    <div className="rink">
      <svg
        ref={svgRef}
        viewBox={`-1 -1 ${RINK_W + 2} ${RINK_H + 2}`}
        preserveAspectRatio="xMidYMid meet"
        onClick={handleClick}
        role={onTap ? 'button' : 'img'}
      >
        <defs>
          <clipPath id="rink-clip"><rect x="0" y="0" width={RINK_W} height={RINK_H} rx={CORNER_R} /></clipPath>
        </defs>
        <g clipPath="url(#rink-clip)" dangerouslySetInnerHTML={{ __html: RINK_MARKINGS }} />
        {logos?.away && <image className="rink-logo" href={logos.away} x={50 - 21} y={42.5 - 21} width={42} height={42} preserveAspectRatio="xMidYMid meet" />}
        {logos?.home && <image className="rink-logo" href={logos.home} x={150 - 21} y={42.5 - 21} width={42} height={42} preserveAspectRatio="xMidYMid meet" />}
        {labels && (
          <g className="rink-labels">
            <text x="50" y="80" textAnchor="middle">{labels.left}</text>
            <text x="150" y="80" textAnchor="middle">{labels.right}</text>
          </g>
        )}
        {heatUrl && <image href={heatUrl} x="0" y="0" width={RINK_W} height={RINK_H} preserveAspectRatio="none" />}
        <g dangerouslySetInnerHTML={{ __html: BOARDS }} />
        {mode === 'dots' && shots.map(s => (
          <g
            key={s.id}
            className={'shot' + (s.id === highlightId ? ' highlight' : '')}
            onClick={onShotTap ? e => { e.stopPropagation(); onShotTap(s); } : undefined}
          >
            {/* Bigger invisible hit area for fingers */}
            {onShotTap && <circle cx={s.x} cy={s.y} r={4} fill="transparent" />}
            <g dangerouslySetInnerHTML={{ __html: shotMarker(s, colors[s.team]) }} />
          </g>
        ))}
      </svg>
      {overlay}
    </div>
  );
}

export function Legend({ t }: { t: { goal: string; save_: string; blocked: string; missed: string } }) {
  const items: [Shot['result'], string][] = [['goal', t.goal], ['save', t.save_], ['blocked', t.blocked], ['missed', t.missed]];
  return (
    <div className="legend">
      {items.map(([r, label]) => (
        <span key={r}>
          <svg viewBox="-4 -4 8 8" width="16" height="16" dangerouslySetInnerHTML={{ __html: shotMarker({ x: 0, y: 0, result: r }, '#888') }} />
          {label}
        </span>
      ))}
    </div>
  );
}
