import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MIN_SKELETON_MS } from '../../../Controller/useAsyncData';
import { askStockInsight, RATING_LABELS } from '../../../Model/Screener/stockInsightModel';
import Card from '../../Components/Common/Card/Card';
import AskForm from '../../Components/AskAI/AskForm/AskForm';
import InsightResult from '../../Components/AskAI/InsightResult/InsightResult';
import InsightResultSkeleton from '../../Components/AskAI/InsightResult/InsightResultSkeleton';
import './AskAIPage.css';

const MAX_RECENT = 6;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// AI Screener › Ask AI: rate any stock good / medium / poor for option
// selling, based on live market data. `?symbol=AAPL` pre-fills and asks.
function AskAIPage() {
  const [params, setParams] = useSearchParams();
  const [form, setForm] = useState({ symbol: params.get('symbol')?.toUpperCase() ?? '', question: '' });
  const [state, setState] = useState({ status: 'idle', result: null, error: null, fields: {} });
  const [recent, setRecent] = useState([]);
  const requestId = useRef(0);

  const ask = useCallback(
    async ({ symbol, question }) => {
      const id = ++requestId.current;
      const startedAt = Date.now();
      setState((prev) => ({ ...prev, status: 'loading', error: null, fields: {} }));
      setParams({ symbol: symbol.trim().toUpperCase() }, { replace: true });
      try {
        const result = await askStockInsight({ symbol, question });
        const remaining = MIN_SKELETON_MS - (Date.now() - startedAt);
        if (remaining > 0) await sleep(remaining);
        if (id !== requestId.current) return; // a newer question was asked
        setState({ status: 'success', result, error: null, fields: {} });
        setRecent((list) =>
          [result, ...list.filter((r) => !(r.symbol === result.symbol && r.question === result.question))].slice(0, MAX_RECENT),
        );
      } catch (err) {
        if (id !== requestId.current) return;
        setState((prev) => ({ status: prev.result ? 'success' : 'error', result: prev.result, error: err.message, fields: err.fields ?? {} }));
      }
    },
    [setParams],
  );

  // Deep link: ask straight away when the page opens with ?symbol=… (only
  // then — picking a ticker later must wait for the user to press Ask).
  const deepLinkSymbol = useRef(form.symbol);
  useEffect(() => {
    if (deepLinkSymbol.current) ask({ symbol: deepLinkSymbol.current, question: '' });
    deepLinkSymbol.current = '';
  }, [ask]);

  const loading = state.status === 'loading';

  return (
    <div className="ask-ai">
      <Card className="ask-ai__intro">
        <div className="ask-ai__heading">
          <span className="ask-ai__eyebrow">AI Screener</span>
          <h1 className="ask-ai__title">Ask AI about a stock</h1>
          <p className="ask-ai__subtitle">
            Get a <strong>Good</strong>, <strong>Medium</strong> or <strong>Poor</strong> rating for selling options on
            any US stock, based on live price, trend and volatility.
          </p>
        </div>
        <AskForm
          symbol={form.symbol}
          question={form.question}
          busy={loading}
          errors={state.fields}
          onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
          onSubmit={() => ask(form)}
        />
        {recent.length > 0 && (
          <div className="ask-ai__recent">
            <span className="ask-ai__recent-label">Recent</span>
            {recent.map((r) => (
              <button
                key={`${r.symbol}|${r.question}`}
                type="button"
                className={`ask-ai__recent-chip ask-ai__recent-chip--${r.rating}`}
                onClick={() => setState({ status: 'success', result: r, error: null, fields: {} })}
                title={r.question || r.headline}
              >
                {r.symbol}
                <span>{RATING_LABELS[r.rating]?.label}</span>
              </button>
            ))}
          </div>
        )}
      </Card>

      <Card className="ask-ai__result">
        {state.error && (
          <div className="ask-ai__error" role="alert">
            {state.error}
          </div>
        )}
        {loading && <InsightResultSkeleton symbol={form.symbol} />}
        {!loading && state.result && <InsightResult insight={state.result} />}
        {!loading && !state.result && <RatingGuide />}
      </Card>
    </div>
  );
}

// Empty state: what each rating means.
function RatingGuide() {
  const rows = [
    ['good', 'Orderly trend or stable range, enough volatility to pay a worthwhile premium, room to be wrong.'],
    ['medium', 'Usable with care: mixed trend, very low or elevated volatility, or near a 52-week extreme.'],
    ['poor', 'Unfavourable now: sharp downtrend, erratic volatility or not enough data.'],
  ];
  return (
    <div className="ask-ai__guide">
      <h2 className="ask-ai__guide-title">How the AI rates a stock</h2>
      <p className="ask-ai__guide-lead">
        The backend pulls live quotes and a year of prices, computes trend, returns and volatility, then asks the AI to
        judge them for selling covered calls, cash-secured puts and spreads over the next few weeks.
      </p>
      <ul className="ask-ai__guide-list">
        {rows.map(([rating, text]) => (
          <li key={rating} className={`ask-ai__guide-item ask-ai__guide-item--${rating}`}>
            <span className="ask-ai__guide-rating">{RATING_LABELS[rating].label}</span>
            <span>{text}</span>
          </li>
        ))}
      </ul>
      <p className="ask-ai__guide-note">Decision support, not advice: you always make the final call.</p>
    </div>
  );
}

export default AskAIPage;
