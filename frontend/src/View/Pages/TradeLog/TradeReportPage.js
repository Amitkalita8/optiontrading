import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Card from '../../Components/Common/Card/Card';
import TickerLogo from '../../Components/Common/TickerLogo/TickerLogo';
import { tradeHistory, getTradeLogEntry } from '../../../Data/tradeLogData';
import { fetchTradeReport } from '../../../Model/TradeLog/tradelogModel';
import '../../Components/Common/Button/Button.css';
import './TradeReportPage.css';

const TIMEFRAME_OPTIONS = ['1m', '5m', '15m', '1h', '5h', '1d'];

// Chart candle presets for different timeframes
const TIMEFRAME_CANDLES = {
  '1m': [
    { time: '09:30', open: 229.8, high: 230.2, low: 229.6, close: 230.1, type: 'up' },
    { time: '09:35', open: 230.1, high: 230.6, low: 229.9, close: 230.49, type: 'up' },
    { time: '09:40', open: 230.49, high: 231.0, low: 230.3, close: 230.8, type: 'up' },
    { time: '09:45', open: 230.8, high: 230.9, low: 230.1, close: 230.2, type: 'down' },
    { time: '09:50', open: 230.2, high: 230.5, low: 229.7, close: 229.9, type: 'down' },
    { time: '09:55', open: 229.9, high: 230.1, low: 229.23, close: 229.4, type: 'down' },
    { time: '10:00', open: 229.4, high: 230.4, low: 229.3, close: 230.2, type: 'up' },
    { time: '10:05', open: 230.2, high: 231.1, low: 230.0, close: 230.82, type: 'up' },
  ],
  '5m': [
    { time: '09:15', open: 229.4, high: 229.9, low: 229.1, close: 229.7, type: 'up' },
    { time: '09:30', open: 229.7, high: 230.8, low: 229.5, close: 230.49, type: 'up' },
    { time: '09:45', open: 230.49, high: 231.4, low: 230.0, close: 230.1, type: 'down' },
    { time: '10:00', open: 230.1, high: 230.3, low: 229.23, close: 229.5, type: 'down' },
    { time: '10:15', open: 229.5, high: 231.2, low: 229.4, close: 230.82, type: 'up' },
    { time: '10:30', open: 230.82, high: 231.5, low: 230.4, close: 231.0, type: 'up' },
  ],
  '15m': [
    { time: '09:15', open: 229.2, high: 229.8, low: 228.9, close: 229.6, type: 'up' },
    { time: '09:30', open: 229.6, high: 231.5, low: 229.4, close: 230.49, type: 'up' },
    { time: '09:45', open: 230.49, high: 231.8, low: 229.8, close: 230.1, type: 'down' },
    { time: '10:00', open: 230.1, high: 230.4, low: 229.23, close: 229.6, type: 'down' },
    { time: '10:15', open: 229.6, high: 231.6, low: 229.5, close: 230.82, type: 'up' },
    { time: '10:30', open: 230.82, high: 231.2, low: 230.2, close: 230.5, type: 'down' },
  ],
  '1h': [
    { time: '09:00', open: 228.5, high: 230.5, low: 228.2, close: 230.1, type: 'up' },
    { time: '10:00', open: 230.1, high: 231.8, low: 229.23, close: 230.82, type: 'up' },
    { time: '11:00', open: 230.82, high: 232.2, low: 230.5, close: 231.9, type: 'up' },
    { time: '12:00', open: 231.9, high: 233.1, low: 231.2, close: 232.6, type: 'up' },
  ],
  '5h': [
    { time: 'Day 1', open: 226.0, high: 231.8, low: 225.5, close: 230.82, type: 'up' },
    { time: 'Day 2', open: 230.82, high: 233.5, low: 229.8, close: 232.9, type: 'up' },
  ],
  '1d': [
    { time: 'Aug 09', open: 225.0, high: 228.4, low: 224.2, close: 228.0, type: 'up' },
    { time: 'Aug 10', open: 228.0, high: 230.2, low: 227.5, close: 229.6, type: 'up' },
    { time: 'Aug 11', open: 229.6, high: 233.12, low: 229.23, close: 230.82, type: 'up' },
    { time: 'Aug 12', open: 230.82, high: 234.0, low: 230.1, close: 233.5, type: 'up' },
  ],
};

function TradeReportPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [selectedTimeframe, setSelectedTimeframe] = useState('15m');
  const [downloading, setDownloading] = useState(false);
  const [trade, setTrade] = useState(() => getTradeLogEntry(id));

  useEffect(() => {
    let isMounted = true;
    setTrade(getTradeLogEntry(id));
    fetchTradeReport(id).then((res) => {
      if (isMounted && res) {
        setTrade((prev) => ({ ...prev, ...res }));
      }
    });
    return () => {
      isMounted = false;
    };
  }, [id]);

  const currentIndex = tradeHistory.findIndex((t) => t.id === trade.id);
  const isPos = (trade.pl !== undefined ? trade.pl : 1200) >= 0;

  const handlePrev = () => {
    const prevIdx = currentIndex > 0 ? currentIndex - 1 : tradeHistory.length - 1;
    navigate(`/trade-log/${tradeHistory[prevIdx].id}`);
  };

  const handleNext = () => {
    const nextIdx = currentIndex < tradeHistory.length - 1 ? currentIndex + 1 : 0;
    navigate(`/trade-log/${tradeHistory[nextIdx].id}`);
  };

  const handleDownload = async () => {
    setDownloading(true);

    try {
      // First attempt download via backend API
      const resp = await fetch(`/api/trade-reports/${trade.id}/download`);
      if (resp.ok) {
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Trade_Report_${trade.symbol}_${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setDownloading(false);
        return;
      }
    } catch (e) {
      // Backend not running; execute client-side export
    }

    setTimeout(() => {
      const reportLines = [
        `======================================================`,
        `                 TRADE REPORT: ${trade.symbol}`,
        `======================================================`,
        `Company:         ${trade.companyName}`,
        `Strategy:        ${trade.strategy}`,
        `Trade Detail:    ${trade.tradeDetail}`,
        `Date:            ${trade.date}`,
        `Net P/L:         ${trade.plFormatted}`,
        `R-Multiple:      ${trade.rMultiple}`,
        `Trade Duration:  ${trade.duration}`,
        `Entry Price:     ${trade.entryPrice}`,
        `Exit Price:      ${trade.exitPrice}`,
        `Lot Size:        ${trade.lotSize || '02'}`,
        `Result:          ${trade.result}`,
        ``,
        `RISK ASSESSMENT`,
        `------------------------------------------------------`,
        `Planned Risk:    $1,000 (1.00%)`,
        `Actual Risk:     $980 (0.98%)`,
        `Planned Reward:  $1,600 (1.60%)`,
        `Actual Reward:   $1,320 (1.32%)`,
        `R-Multiple:      ${trade.rMultiple}`,
        `Note:            This trade risked 0.98% to make 1.32%.`,
        ``,
        `TRADE THESIS`,
        `------------------------------------------------------`,
        `Strategy:        ${trade.strategy}`,
        `AI Confidence:   ${trade.tradeThesis?.aiConfidence || '82% - High'}`,
        `Status:          All criteria met. Trade followed the plan.`,
        ``,
        `TRADE DIAGNOSIS`,
        `------------------------------------------------------`,
        `1. [Opportunity] Held profit too short (+ $420 more potential)`,
        `2. [Monitor]     Excess risk (slightly above average)`,
        `3. [Improve]     Exit timing (before key resistance)`,
        `4. [Strength]    Rule adherence (followed plan, avoided emotions)`,
        ``,
        `ACTION PLAN`,
        `------------------------------------------------------`,
        `Weekly Target:   $5,000 (Current: $2,840 - 56%)`,
        `Campaign Target: $1,200,000 (Current: $32,179 - 2.68%)`,
        `Focus This Week: Focus on improving exit timing using RSI signal.`,
        `Key Takeaway:    Let winners run and trust your plan. Patience = Profit.`,
        `======================================================`,
      ];

      const blob = new Blob([reportLines.join('\n')], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Trade_Report_${trade.symbol}_${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setDownloading(false);
    }, 400);
  };

  const currentCandles = TIMEFRAME_CANDLES[selectedTimeframe] || TIMEFRAME_CANDLES['15m'];

  const riskAssessment = trade.riskAssessment || {
    planNetRisk: '$1,000 (1.00%)',
    actualRisk: '$980 (0.98%)',
    planNetReward: '$1,600 (1.60%)',
    actualReward: '$1,320 (1.32%)',
    rMultipleVal: trade.rMultiple || '1.32R',
    rMultipleNote: 'This trade risked 0.98% to make 1.32%.',
  };

  const tradeDiagnosis = trade.tradeDiagnosis || [
    { tag: 'Opportunity', tone: 'green', title: 'Held profit too short', desc: 'Price moved further in your favor after exit.', sub: 'Potential: + $420 more' },
    { tag: 'Monitor', tone: 'amber', title: 'Excess risk', desc: 'Risk was within limit but slightly above your average.' },
    { tag: 'Improve', tone: 'red', title: 'Exit timing', desc: 'Exit before any major move. Consider trailing stop or partial exit.' },
    { tag: 'Strength', tone: 'green', title: 'Rule adherence', desc: 'Great job! You followed the right plan and avoided emotional decisions.' },
  ];

  const actionPlan = trade.actionPlan || {
    weeklyProgress: { target: 5000, current: 2840, pct: 56 },
    campaignProgress: { target: 1200000, current: 32179, pct: 2.68 },
    weeklyAdvice: 'Focus on improving exit timing using RSI signal.',
    keyTakeaway: 'Let winners run and trust your plan. Patience = Profit.',
  };

  const tradeThesis = trade.tradeThesis || {
    strategy: trade.strategy || 'Covered Call',
    detail: trade.tradeDetail || 'Sell 1 × $920 Call',
    aiConfidence: trade.aiConfidence || '82% - High',
    criteria: [
      'Price above resistance',
      'Volume Spike',
      'RSI above 50',
      'No major news/events',
      'Entry confirmation',
    ],
    banner: 'All criteria met. Trade followed the plan.',
  };

  const performanceBenchmark = trade.performanceBenchmark || {
    avgWin: '+$1,500',
    thisTrade: '+$1,320',
    winRateSetup: '55%',
    overallWinRate: '48%',
  };

  return (
    <div className="trade-report-view">
      {/* Top Header Row */}
      <div className="trade-report-view__header">
        <div className="trade-report-view__title-group">
          <div className="trade-report-view__title-row">
            <Link to="/trade-log" className="trade-report-view__back-crumb" title="Back to Trade Log">
              ←
            </Link>
            <h1 className="trade-report-view__main-title">Trade Report</h1>
          </div>
          <p className="trade-report-view__sub-title">
            Detailed analysis of your trade performance and insights
          </p>
        </div>

        <button
          type="button"
          className="trade-report-view__dl-btn"
          onClick={handleDownload}
          disabled={downloading}
        >
          <span className="trade-report-view__dl-icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </span>
          <span>{downloading ? 'Preparing...' : 'Download Report'}</span>
        </button>
      </div>

      {/* Top Summary Segmented Card */}
      <div className="tr-summary-strip">
        {/* Segment 1: Company Logo & Names */}
        <div className="tr-summary-strip__col tr-summary-strip__col--ticker">
          <TickerLogo ticker={trade.symbol} size={42} />
          <div className="tr-summary-strip__name-block">
            <span className="tr-summary-strip__sym">{trade.symbol}</span>
            <span className="tr-summary-strip__corp">{trade.companyName.toUpperCase()}</span>
          </div>
        </div>

        {/* Segment 2: Net P/L */}
        <div className="tr-summary-strip__col">
          <span className="tr-summary-strip__lbl">Net P/L</span>
          <span className={`tr-summary-strip__val ${isPos ? 'is-green' : 'is-red'}`}>
            {trade.plFormatted}
          </span>
        </div>

        {/* Segment 3: R-Multiple */}
        <div className="tr-summary-strip__col">
          <span className="tr-summary-strip__lbl">R-Multiple</span>
          <span className="tr-summary-strip__val">{trade.rMultiple}</span>
        </div>

        {/* Segment 4: Trade Duration */}
        <div className="tr-summary-strip__col">
          <span className="tr-summary-strip__lbl">Trade Duration</span>
          <span className="tr-summary-strip__val">{trade.duration}</span>
        </div>

        {/* Segment 5: Entry Price */}
        <div className="tr-summary-strip__col">
          <span className="tr-summary-strip__lbl">Entry Price</span>
          <span className="tr-summary-strip__val">{trade.entryPrice}</span>
        </div>

        {/* Segment 6: Exit Price */}
        <div className="tr-summary-strip__col">
          <span className="tr-summary-strip__lbl">Exit Price</span>
          <span className="tr-summary-strip__val">{trade.exitPrice}</span>
        </div>

        {/* Segment 7: Lot Size */}
        <div className="tr-summary-strip__col">
          <span className="tr-summary-strip__lbl">Lot Size</span>
          <span className="tr-summary-strip__val">{trade.lotSize || '02'}</span>
        </div>

        {/* Segment 8: Result */}
        <div className="tr-summary-strip__col tr-summary-strip__col--last">
          <span className="tr-summary-strip__lbl">Result</span>
          <span className={`tr-summary-strip__val ${isPos ? 'is-green' : 'is-red'}`}>
            {trade.result}
          </span>
        </div>
      </div>

      {/* ROW 1: Trade Replay & Trade Thesis */}
      <div className="tr-grid-row tr-grid-row--2col">
        {/* Card: Trade Replay */}
        <Card className="tr-card">
          <div className="tr-card__head">
            <div>
              <h2 className="tr-card__title">Trade Replay</h2>
              <span className="tr-card__subtitle">{trade.symbol} - Aug 11, 2026</span>
            </div>
            <div className="tr-tf-pills">
              {TIMEFRAME_OPTIONS.map((tf) => (
                <button
                  key={tf}
                  type="button"
                  className={`tr-tf-btn ${selectedTimeframe === tf ? 'is-active' : ''}`}
                  onClick={() => setSelectedTimeframe(tf)}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          {/* SVG Candlestick Plot */}
          <div className="tr-replay-chart">
            <svg viewBox="0 0 520 200" className="tr-replay-chart__svg" preserveAspectRatio="none">
              {/* Horizontal Grid Lines */}
              <line x1="45" y1="20" x2="520" y2="20" stroke="#f1efe9" strokeWidth="1" />
              <text x="5" y="24" fill="#87918c" fontSize="10.5" fontFamily="sans-serif">233.00</text>

              <line x1="45" y1="52" x2="520" y2="52" stroke="#f1efe9" strokeWidth="1" />
              <text x="5" y="56" fill="#87918c" fontSize="10.5" fontFamily="sans-serif">232.00</text>

              <line x1="45" y1="84" x2="520" y2="84" stroke="#f1efe9" strokeWidth="1" />
              <text x="5" y="88" fill="#87918c" fontSize="10.5" fontFamily="sans-serif">231.00</text>

              <line x1="45" y1="116" x2="520" y2="116" stroke="#f1efe9" strokeWidth="1" />
              <text x="5" y="120" fill="#87918c" fontSize="10.5" fontFamily="sans-serif">230.00</text>

              <line x1="45" y1="148" x2="520" y2="148" stroke="#f1efe9" strokeWidth="1" />
              <text x="5" y="152" fill="#87918c" fontSize="10.5" fontFamily="sans-serif">229.00</text>

              <line x1="45" y1="180" x2="520" y2="180" stroke="#f1efe9" strokeWidth="1" />
              <text x="5" y="184" fill="#87918c" fontSize="10.5" fontFamily="sans-serif">228.00</text>

              {/* Dotted Stop Loss Line (Red) */}
              <line x1="45" y1="140" x2="520" y2="140" stroke="#fca5a5" strokeWidth="1.2" strokeDasharray="3 3" />

              {/* Dotted Entry Line (Green) */}
              <line x1="45" y1="100" x2="520" y2="100" stroke="#9ad9b6" strokeWidth="1.2" strokeDasharray="3 3" />

              {/* Dotted Exit Line (Neutral) */}
              <line x1="45" y1="70" x2="520" y2="70" stroke="#cbd5e1" strokeWidth="1.2" strokeDasharray="3 3" />

              {/* Candles */}
              {currentCandles.map((c, i) => {
                const totalCandles = currentCandles.length;
                const slotWidth = (520 - 70) / totalCandles;
                const x = 70 + i * slotWidth;
                const isGreen = c.type === 'up';
                const candleColor = isGreen ? '#278556' : '#e05252';

                // Map price 228 -> 180, 233 -> 20
                const mapPrice = (p) => 180 - ((p - 228) / 5) * 160;
                const topWick = mapPrice(c.high);
                const botWick = mapPrice(c.low);
                const bodyTop = mapPrice(Math.max(c.open, c.close));
                const bodyBot = mapPrice(Math.min(c.open, c.close));
                const bodyHeight = Math.max(5, bodyBot - bodyTop);

                return (
                  <g key={i}>
                    {/* Wick */}
                    <line x1={x + 7} y1={topWick} x2={x + 7} y2={botWick} stroke={candleColor} strokeWidth="1.5" />
                    {/* Body */}
                    <rect x={x} y={bodyTop} width="14" height={bodyHeight} fill={candleColor} rx="1" />
                    {/* Time Label */}
                    <text x={x + 7} y="196" fill="#87918c" fontSize="10" textAnchor="middle">{c.time}</text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Marker Legend */}
          <div className="tr-replay-markers">
            <div className="tr-replay-marker">
              <span className="tr-marker-box tr-marker-box--green" />
              <span>Entry $230.49</span>
            </div>
            <div className="tr-replay-marker">
              <span className="tr-marker-box tr-marker-box--red" />
              <span>Stop Loss $229.23</span>
            </div>
            <div className="tr-replay-marker">
              <span className="tr-marker-box tr-marker-box--dark" />
              <span>Exit $230.82</span>
            </div>
          </div>
        </Card>

        {/* Card: Trade Thesis */}
        <Card className="tr-card">
          <h2 className="tr-card__title">Trade Thesis</h2>

          {/* Cream Metadata Card */}
          <div className="tr-thesis-meta-box">
            <div className="tr-thesis-meta-col">
              <span className="tr-thesis-meta-lbl">Strategy</span>
              <span className="tr-thesis-meta-val">{tradeThesis.strategy}</span>
            </div>
            <div className="tr-thesis-meta-col">
              <span className="tr-thesis-meta-lbl">Trade Detail</span>
              <span className="tr-thesis-meta-val">{tradeThesis.detail}</span>
            </div>
            <div className="tr-thesis-meta-col">
              <span className="tr-thesis-meta-lbl">AI confidence</span>
              <span className="tr-thesis-meta-val">{tradeThesis.aiConfidence || '82% - High'}</span>
            </div>
          </div>

          {/* Criteria Checklist */}
          <div className="tr-criteria-section">
            <h3 className="tr-criteria-heading">Plan criteria</h3>
            <div className="tr-criteria-list">
              {tradeThesis.criteria.map((crit, idx) => (
                <div key={idx} className="tr-criteria-row">
                  <span className="tr-criteria-text">{crit}</span>
                  <span className="tr-criteria-check" aria-hidden="true">✓</span>
                </div>
              ))}
            </div>
          </div>

          {/* Adherence Banner */}
          <div className="tr-thesis-adherence-banner">
            {tradeThesis.banner}
          </div>
        </Card>
      </div>

      {/* ROW 2: Risk Assessment & Performance Benchmark */}
      <div className="tr-grid-row tr-grid-row--2col">
        {/* Card: Risk Assessment */}
        <Card className="tr-card">
          <h2 className="tr-card__title">Risk Assessment</h2>
          <div className="tr-risk-content">
            {/* Table */}
            <div className="tr-risk-table">
              <div className="tr-risk-row">
                <span className="tr-risk-lbl">Planned risk</span>
                <span className="tr-risk-val">$ 1,000 (1.00%)</span>
              </div>
              <div className="tr-risk-row">
                <span className="tr-risk-lbl">Actual risk</span>
                <span className="tr-risk-val">$ 980 (0.98%)</span>
              </div>
              <div className="tr-risk-row">
                <span className="tr-risk-lbl">Planned reward</span>
                <span className="tr-risk-val">$ 1,600 (1.60%)</span>
              </div>
              <div className="tr-risk-row">
                <span className="tr-risk-lbl">Actual reward</span>
                <span className="tr-risk-val is-green">$ 1,320 (1.32%)</span>
              </div>
            </div>

            {/* Gauge & Callout */}
            <div className="tr-risk-meter-box">
              <div className="tr-meter-circle">
                <svg viewBox="0 0 80 80" className="tr-meter-circle__svg">
                  <circle cx="40" cy="40" r="34" fill="none" stroke="#e6e4dc" strokeWidth="5" />
                  <circle
                    cx="40"
                    cy="40"
                    r="34"
                    fill="none"
                    stroke="#1f7a4d"
                    strokeWidth="5"
                    strokeDasharray="213"
                    strokeDashoffset="65"
                    strokeLinecap="round"
                    transform="rotate(-90 40 40)"
                  />
                </svg>
                <div className="tr-meter-circle__text">
                  <span className="tr-meter-num">1.32R</span>
                  <span className="tr-meter-lbl">R-Multiple</span>
                </div>
              </div>
              <div className="tr-meter-callout">
                <span>This trade risked 0.98%</span>
                <span>to make 1.32%.</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Card: Performance Benchmark */}
        <Card className="tr-card">
          <h2 className="tr-card__title">Performance Benchmark</h2>
          <div className="tr-benchmark-content">
            <div className="tr-bm-table">
              <div className="tr-bm-row">
                <span className="tr-bm-lbl">Your average win</span>
                <span className="tr-bm-val is-green">+ $1,500</span>
              </div>
              <div className="tr-bm-row">
                <span className="tr-bm-lbl">This trade</span>
                <span className="tr-bm-val is-green">+ $1,320</span>
              </div>
              <div className="tr-bm-row">
                <span className="tr-bm-lbl">Win rate (This setup)</span>
                <span className="tr-bm-val">55%</span>
              </div>
              <div className="tr-bm-row">
                <span className="tr-bm-lbl">Overall win rate</span>
                <span className="tr-bm-val">48%</span>
              </div>
            </div>

            <div className="tr-bm-graphic-card">
              {/* Mini 3D candlesticks graphic */}
              <div className="tr-bm-mini-chart">
                <svg viewBox="0 0 100 50" className="tr-bm-svg">
                  <line x1="15" y1="40" x2="15" y2="20" stroke="#278556" strokeWidth="2" />
                  <rect x="12" y="24" width="6" height="12" fill="#278556" rx="1" />
                  <line x1="35" y1="45" x2="35" y2="15" stroke="#278556" strokeWidth="2" />
                  <rect x="32" y="18" width="6" height="18" fill="#278556" rx="1" />
                  <line x1="55" y1="35" x2="55" y2="10" stroke="#e05252" strokeWidth="2" />
                  <rect x="52" y="14" width="6" height="16" fill="#e05252" rx="1" />
                  <line x1="75" y1="42" x2="75" y2="12" stroke="#278556" strokeWidth="2" />
                  <rect x="72" y="16" width="6" height="18" fill="#278556" rx="1" />
                </svg>
              </div>
              <p className="tr-bm-note">
                This trade was better than 68% of your last 5 trades.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* ROW 3: Trade Diagnosis (Full Width, 4 Cards) */}
      <Card className="tr-card">
        <h2 className="tr-card__title">Trade Diagnosis</h2>
        <div className="tr-diag-row">
          {/* Box 1 */}
          <div className="tr-diag-item">
            <span className="tr-diag-tag tr-diag-tag--green">Opportunity</span>
            <h3 className="tr-diag-title">Held profit too short</h3>
            <p className="tr-diag-desc">
              Price moved further in your favor after exit.
            </p>
            <p className="tr-diag-sub">Potential: + $420 more</p>
          </div>

          {/* Box 2 */}
          <div className="tr-diag-item">
            <span className="tr-diag-tag tr-diag-tag--amber">Monitor</span>
            <h3 className="tr-diag-title">Excess risk</h3>
            <p className="tr-diag-desc">
              Risk was within limit but slightly above your average.
            </p>
          </div>

          {/* Box 3 */}
          <div className="tr-diag-item">
            <span className="tr-diag-tag tr-diag-tag--red">Improve</span>
            <h3 className="tr-diag-title">Exit timing</h3>
            <p className="tr-diag-desc">
              Exit before any major move. Consider trailing stop or partial exit.
            </p>
          </div>

          {/* Box 4 */}
          <div className="tr-diag-item">
            <span className="tr-diag-tag tr-diag-tag--green">Strength</span>
            <h3 className="tr-diag-title">Rule adherence</h3>
            <p className="tr-diag-desc">
              Great job! You followed the right plan and avoided emotional decisions.
            </p>
          </div>
        </div>
      </Card>

      {/* ROW 4: Action Plan (Full Width, 4 Columns) */}
      <Card className="tr-card">
        <h2 className="tr-card__title">Action Plan</h2>
        <div className="tr-action-plan-row">
          {/* Column 1: Weekly goal progress */}
          <div className="tr-ap-progress-card">
            <h3 className="tr-ap-heading">Weekly goal progress</h3>
            <div className="tr-ap-meta">
              <div>
                <span className="tr-ap-meta-lbl">PROFIT TARGET</span>
                <span className="tr-ap-meta-val">$ 5,000</span>
              </div>
              <div className="tr-ap-meta--right">
                <span className="tr-ap-meta-lbl">CURRENT TARGET</span>
                <span className="tr-ap-meta-val">$ 2,840</span>
              </div>
            </div>
            {/* Dual Track with 35% and 56% Pills */}
            <div className="tr-dual-track">
              <div className="tr-dual-track__bar">
                <div className="tr-dual-track__fill-base" style={{ width: '35%' }} />
                <div className="tr-dual-track__fill-current" style={{ width: '56%' }} />
              </div>
              <div className="tr-dual-track__pills">
                <span className="tr-track-pill tr-track-pill--base" style={{ left: '35%' }}>35%</span>
                <span className="tr-track-pill tr-track-pill--current" style={{ left: '56%' }}>56%</span>
              </div>
            </div>
          </div>

          {/* Column 2: Campaign goal progress */}
          <div className="tr-ap-progress-card">
            <h3 className="tr-ap-heading">Campaign goal progress</h3>
            <div className="tr-ap-meta">
              <div>
                <span className="tr-ap-meta-lbl">PROFIT TARGET</span>
                <span className="tr-ap-meta-val">$ 1,200,000</span>
              </div>
              <div className="tr-ap-meta--right">
                <span className="tr-ap-meta-lbl">CURRENT TARGET</span>
                <span className="tr-ap-meta-val">$ 32,179</span>
              </div>
            </div>
            {/* Track with 2.68% Pill */}
            <div className="tr-dual-track">
              <div className="tr-dual-track__bar">
                <div className="tr-dual-track__fill-current" style={{ width: '12%' }} />
              </div>
              <div className="tr-dual-track__pills">
                <span className="tr-track-pill tr-track-pill--current" style={{ left: '10%' }}>2.68%</span>
              </div>
            </div>
          </div>

          {/* Column 3: Focus this week */}
          <div className="tr-ap-callout tr-ap-callout--green">
            <div className="tr-ap-callout__icon-wrap">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#278556" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="6" />
                <circle cx="12" cy="12" r="2" />
              </svg>
            </div>
            <div>
              <h4 className="tr-ap-callout__title">Focus this week</h4>
              <p className="tr-ap-callout__desc">Focus on improving exit timing using RSI signal.</p>
            </div>
          </div>

          {/* Column 4: Key takeaway */}
          <div className="tr-ap-callout tr-ap-callout--amber">
            <div className="tr-ap-callout__icon-wrap">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18h6" />
                <path d="M10 22h4" />
                <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5.76.76 1.23 1.52 1.41 2.5" />
              </svg>
            </div>
            <div>
              <h4 className="tr-ap-callout__title">Key takeaway</h4>
              <p className="tr-ap-callout__desc">Let winners run and trust your plan. Patience = Profit.</p>
            </div>
          </div>
        </div>
      </Card>

      {/* ROW 5: Bottom Navigation */}
      <div className="tr-bottom-nav">
        <button
          type="button"
          className="tr-nav-btn tr-nav-btn--prev"
          onClick={handlePrev}
        >
          &lt; Previous Trade
        </button>

        <span className="tr-nav-page-indicator">
          {currentIndex + 1} of {tradeHistory.length}
        </span>

        <button
          type="button"
          className="tr-nav-btn tr-nav-btn--next"
          onClick={handleNext}
        >
          Next Trade &gt;
        </button>
      </div>
    </div>
  );
}

export default TradeReportPage;
