import { useEffect, useState } from 'react';
import useStockHistory from '../../../../Controller/useStockHistory';
import { useMarketStatus } from '../../../../Controller/MarketStatusContext';
import { CHART_RANGES } from '../../../../Model/MarketData/historyModel';
import Skeleton from '../Skeleton/Skeleton';
import PriceLineChart from './PriceLineChart';
import RangeSelector from './RangeSelector';
import { RANGE_LABELS, formatAsOf, formatChange, formatPointTime, formatUSD } from './chartFormat';
import './StockChart.css';

// Groww-style price chart: price + change for the selected range, interactive
// line (hover shows the point's price and time), range pills below.
// `livePrice`/`liveTime` (from the quote stream) keep the header current and,
// on 1D while the market is open, extend the line in real time between
// history refreshes. `previousClose` is the 1D baseline until history loads.
// `align` centres the header (dashboard card) or not (page).
function StockChart({
  symbol,
  ranges = CHART_RANGES,
  defaultRange = '1D',
  height = 260,
  livePrice,
  liveTime,
  previousClose,
  align = 'left',
  size = 'md',
  badge,
}) {
  const [range, setRange] = useState(defaultRange);
  const [hoverIndex, setHoverIndex] = useState(null);
  const { data, status, retry } = useStockHistory(symbol, range);
  const { status: market } = useMarketStatus();
  const [ticks, setTicks] = useState([]);

  const history = data?.points ?? [];
  const lastHistoryT = history.length ? history[history.length - 1].t : 0;
  const streaming = range === '1D' && Boolean(market?.isOpen);

  // Each new history load already contains the ticks so far: start over.
  useEffect(() => setTicks([]), [data]);

  // Real-time 1D: append each streamed price (≈ every 5 s) after the last bar.
  useEffect(() => {
    if (!streaming || livePrice == null || !liveTime || liveTime <= lastHistoryT) return;
    setTicks((prev) => {
      const lastTick = prev[prev.length - 1];
      if (lastTick && liveTime < lastTick.t) return prev;
      if (lastTick && liveTime === lastTick.t) return [...prev.slice(0, -1), { t: liveTime, p: livePrice }];
      return [...prev, { t: liveTime, p: livePrice }];
    });
  }, [streaming, livePrice, liveTime, lastHistoryT]);

  const points = streaming && ticks.length ? [...history, ...ticks] : history;
  // 1D change is vs the previous close, which the live quote also knows.
  const baseline = data?.baseline || (range === '1D' ? previousClose : 0) || 0;
  const last = points[points.length - 1];
  const hovered = hoverIndex != null ? points[hoverIndex] : null;
  // Like Groww: the header shows the live price at every range (change measured
  // from the range's baseline); daily/weekly bars would otherwise lag it.
  const useLive = !hovered && livePrice != null;
  const price = hovered?.p ?? (useLive ? livePrice : last?.p);
  const change = price != null ? price - baseline : 0;
  const trendUp = (useLive ? livePrice : last?.p ?? 0) >= baseline;
  const time = useLive && liveTime ? liveTime : last?.t;

  const changeRange = (r) => {
    setHoverIndex(null);
    setRange(r);
  };

  let body;
  if (!data && status === 'loading') {
    body = <Skeleton height={height} radius={8} />;
  } else if (status === 'error' && !data) {
    body = (
      <div className="stock-chart__message" style={{ height }}>
        Chart data is unavailable.
        <button type="button" onClick={retry}>
          Try again
        </button>
      </div>
    );
  } else if (points.length < 2) {
    body = (
      <div className="stock-chart__message" style={{ height }}>
        No price data for this range yet.
      </div>
    );
  } else {
    body = (
      <PriceLineChart
        points={points}
        baseline={baseline}
        showBaseline={range === '1D'}
        up={trendUp}
        height={height}
        range={range}
        hoverIndex={hoverIndex}
        onHover={setHoverIndex}
        dimmed={status === 'loading'}
      />
    );
  }

  return (
    <div className={`stock-chart stock-chart--${align} stock-chart--${size}`}>
      <div className="stock-chart__header">
        {price != null ? (
          <>
            <div className="stock-chart__price-row">
              <span className="stock-chart__price">{formatUSD(price)}</span>
              {/* No baseline (history failed, not 1D) = no meaningful change to show. */}
              {baseline > 0 && (
                <span className={`stock-chart__change stock-chart__change--${change >= 0 ? 'up' : 'down'}`}>
                  {formatChange(change, baseline)}
                </span>
              )}
              <span className="stock-chart__range">{RANGE_LABELS[range]}</span>
            </div>
            <span className="stock-chart__time">
              {hovered ? formatPointTime(hovered.t, range) : time ? formatAsOf(time) : ' '}
            </span>
          </>
        ) : (
          <>
            <Skeleton width={220} height={30} />
            <Skeleton width={120} height={14} />
          </>
        )}
        {badge}
      </div>

      {status === 'error' && data && (
        <p className="stock-chart__stale" role="status">
          Couldn&apos;t refresh — showing the last loaded data.
        </p>
      )}

      {body}

      <RangeSelector ranges={ranges} value={range} onChange={changeRange} />
    </div>
  );
}

export default StockChart;
