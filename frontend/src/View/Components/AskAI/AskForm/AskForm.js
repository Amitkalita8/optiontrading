import { companies } from '../../../../Data/mockData';
import {
  MAX_QUESTION_LENGTH,
  SUGGESTED_QUESTIONS,
  SUGGESTED_TICKERS,
} from '../../../../Model/Screener/stockInsightModel';
import Button from '../../Common/Button/Button';
import './AskForm.css';

// Ticker + optional question, with one-tap suggestions for both.
function AskForm({ symbol, question, busy, errors = {}, onChange, onSubmit }) {
  const submit = (e) => {
    e.preventDefault();
    if (!busy) onSubmit();
  };

  return (
    <form className="ask-form" onSubmit={submit} noValidate>
      <div className="ask-form__row">
        <label className="ask-form__field ask-form__field--ticker">
          <span className="ask-form__label">Stock ticker</span>
          <input
            className={`ask-form__input ${errors.symbol ? 'ask-form__input--invalid' : ''}`}
            value={symbol}
            onChange={(e) => onChange({ symbol: e.target.value.toUpperCase() })}
            placeholder="e.g. AAPL"
            list="ask-form-tickers"
            autoComplete="off"
            spellCheck="false"
            maxLength={15}
            aria-invalid={Boolean(errors.symbol)}
          />
          <datalist id="ask-form-tickers">
            {companies.map((c) => (
              <option key={c.ticker} value={c.ticker}>
                {c.name}
              </option>
            ))}
          </datalist>
          {errors.symbol && <span className="field-error">{errors.symbol}</span>}
        </label>

        <label className="ask-form__field ask-form__field--question">
          <span className="ask-form__label">
            Your question <span className="ask-form__optional">(optional)</span>
          </span>
          <input
            className={`ask-form__input ${errors.question ? 'ask-form__input--invalid' : ''}`}
            value={question}
            onChange={(e) => onChange({ question: e.target.value })}
            placeholder="Is it good for selling puts this month?"
            maxLength={MAX_QUESTION_LENGTH}
            aria-invalid={Boolean(errors.question)}
          />
          {errors.question && <span className="field-error">{errors.question}</span>}
        </label>

        <Button type="submit" className="ask-form__submit" disabled={busy || !symbol.trim()}>
          {busy ? 'Analysing…' : 'Ask AI'}
        </Button>
      </div>

      <div className="ask-form__suggestions">
        <span className="ask-form__suggest-label">Try</span>
        {SUGGESTED_TICKERS.map((t) => (
          <button
            key={t}
            type="button"
            className={`ask-form__chip ${symbol === t ? 'ask-form__chip--active' : ''}`}
            onClick={() => onChange({ symbol: t })}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="ask-form__suggestions">
        <span className="ask-form__suggest-label">Ask</span>
        {SUGGESTED_QUESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            className={`ask-form__chip ask-form__chip--question ${question === q ? 'ask-form__chip--active' : ''}`}
            onClick={() => onChange({ question: q })}
          >
            {q}
          </button>
        ))}
      </div>
    </form>
  );
}

export default AskForm;
