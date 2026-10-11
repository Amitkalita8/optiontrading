import { useState } from 'react';
import './StrategyPicker.css';

const VISIBLE = 5;

// Toggle chips for authorised strategies. Collapsed it shows the first five
// plus any selected ones, and a "+ N more" chip to reveal the rest.
function StrategyPicker({ options, value, onChange, error }) {
  const [expanded, setExpanded] = useState(false);
  const selected = new Set(value);
  const shown = expanded ? options : options.filter((s, i) => i < VISIBLE || selected.has(s));
  const hidden = options.length - shown.length;

  const toggle = (s) => onChange(selected.has(s) ? value.filter((v) => v !== s) : [...value, s]);

  return (
    <fieldset className="strategy-picker span-2">
      <legend className="strategy-picker__label">Authorized Strategies</legend>
      <div className="strategy-picker__chips">
        {shown.map((s) => {
          const on = selected.has(s);
          return (
            <button
              key={s}
              type="button"
              className={`strategy-chip ${on ? 'strategy-chip--on' : ''}`}
              aria-pressed={on}
              onClick={() => toggle(s)}
            >
              <span aria-hidden="true">{on ? '✓' : '+'}</span>
              {s}
            </button>
          );
        })}
        {hidden > 0 && (
          <button type="button" className="strategy-chip strategy-chip--more" onClick={() => setExpanded(true)}>
            <span aria-hidden="true">+</span>
            {hidden} more
          </button>
        )}
        {expanded && (
          <button type="button" className="strategy-chip strategy-chip--more" onClick={() => setExpanded(false)}>
            Show less
          </button>
        )}
      </div>
      {error && (
        <span className="field-error" role="alert">
          {error}
        </span>
      )}
    </fieldset>
  );
}

export default StrategyPicker;
