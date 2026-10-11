import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { formatPointTime, formatUSD } from './chartFormat';

const TOP = 30; // room for the hover label
const BOTTOM = 6;
const LABEL_HALF_WIDTH = 82;

function useWidth(ref) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    const measure = () => setWidth(el.clientWidth);
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return width;
}

// Interactive price line. Points are spaced evenly by index (like Groww), so
// nights and weekends don't leave gaps. Hover/touch/arrow keys move a
// crosshair; `onHover(index | null)` reports it to the parent header.
function PriceLineChart({ points, baseline, showBaseline, up, height, range, hoverIndex, onHover, dimmed }) {
  const wrapRef = useRef(null);
  const width = useWidth(wrapRef);
  const gradientId = useId();
  const n = points.length;

  const geo = useMemo(() => {
    if (!width || n === 0) return null;
    let min = Infinity;
    let max = -Infinity;
    for (const { p } of points) {
      if (p < min) min = p;
      if (p > max) max = p;
    }
    if (showBaseline && baseline) {
      min = Math.min(min, baseline);
      max = Math.max(max, baseline);
    }
    const pad = (max - min) * 0.06 || max * 0.01 || 1;
    min -= pad;
    max += pad;
    const plotH = height - TOP - BOTTOM;
    const x = (i) => (n === 1 ? width / 2 : (i / (n - 1)) * width);
    const y = (v) => TOP + ((max - v) / (max - min)) * plotH;
    let line = '';
    for (let i = 0; i < n; i += 1) line += `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(points[i].p).toFixed(1)}`;
    const area = `${line}L${x(n - 1).toFixed(1)},${height}L${x(0).toFixed(1)},${height}Z`;
    return { x, y, line, area };
  }, [points, n, width, height, baseline, showBaseline]);

  const indexAt = (clientX) => {
    const rect = wrapRef.current.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return Math.round(ratio * (n - 1));
  };

  const onKeyDown = (e) => {
    if (n === 0) return;
    const current = hoverIndex ?? n - 1;
    const step = e.shiftKey ? 10 : 1;
    const moves = {
      ArrowLeft: Math.max(0, current - step),
      ArrowRight: Math.min(n - 1, current + step),
      Home: 0,
      End: n - 1,
    };
    if (e.key in moves) {
      e.preventDefault();
      onHover(moves[e.key]);
    } else if (e.key === 'Escape') {
      onHover(null);
    }
  };

  const hovered = hoverIndex != null && points[hoverIndex];
  const hx = hovered && geo ? geo.x(hoverIndex) : 0;
  const labelLeft = Math.min(Math.max(hx, LABEL_HALF_WIDTH), Math.max(LABEL_HALF_WIDTH, width - LABEL_HALF_WIDTH));

  return (
    <div
      ref={wrapRef}
      className={`price-chart ${up ? 'price-chart--up' : 'price-chart--down'} ${dimmed ? 'price-chart--dimmed' : ''}`}
      style={{ height }}
      tabIndex={0}
      role="group"
      aria-label="Price chart. Use left and right arrow keys to read prices."
      onPointerMove={(e) => n && onHover(indexAt(e.clientX))}
      onPointerDown={(e) => n && onHover(indexAt(e.clientX))}
      onPointerLeave={(e) => e.pointerType === 'mouse' && onHover(null)}
      onPointerUp={(e) => e.pointerType !== 'mouse' && onHover(null)}
      onPointerCancel={() => onHover(null)}
      onKeyDown={onKeyDown}
      onBlur={() => onHover(null)}
    >
      {geo && (
        <svg width={width} height={height} aria-hidden="true">
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.16" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>
          {showBaseline && baseline > 0 && (
            <line
              className="price-chart__baseline"
              x1="0"
              x2={width}
              y1={geo.y(baseline)}
              y2={geo.y(baseline)}
            />
          )}
          <path d={geo.area} fill={`url(#${gradientId})`} />
          <path d={geo.line} className="price-chart__line" />
          {hovered && (
            <>
              <line className="price-chart__crosshair" x1={hx} x2={hx} y1={TOP - 4} y2={height} />
              <circle className="price-chart__dot" cx={hx} cy={geo.y(hovered.p)} r="4.5" />
            </>
          )}
        </svg>
      )}

      {hovered && (
        <div className="price-chart__label" style={{ left: labelLeft }}>
          <b>{formatUSD(hovered.p)}</b>
          <span>|</span>
          {formatPointTime(hovered.t, range)}
        </div>
      )}
      <span className="visually-hidden" aria-live="polite">
        {hovered ? `${formatUSD(hovered.p)} at ${formatPointTime(hovered.t, range)}` : ''}
      </span>
    </div>
  );
}

export default PriceLineChart;
