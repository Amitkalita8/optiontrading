import { RANGE_LABELS } from './chartFormat';

// Row of range pills (1D 1W 1M …), Groww style.
function RangeSelector({ ranges, value, onChange }) {
  return (
    <div className="range-selector" role="group" aria-label="Chart range">
      {ranges.map((r) => (
        <button
          key={r}
          type="button"
          className={`range-selector__btn ${r === value ? 'range-selector__btn--active' : ''}`}
          aria-pressed={r === value}
          onClick={() => onChange(r)}
        >
          {RANGE_LABELS[r] ?? r}
        </button>
      ))}
    </div>
  );
}

export default RangeSelector;
