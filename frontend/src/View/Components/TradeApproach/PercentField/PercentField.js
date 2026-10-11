import { useId } from 'react';
import './PercentField.css';

// Underlined number input with a unit suffix and a hint on the right
// (design: "8.00 %            min threshold").
function PercentField({ label, value, onChange, hint, suffix = '%', min, max, step = 0.01, error, className = '' }) {
  const id = useId();
  return (
    <div className={`percent-field ${error ? 'percent-field--error' : ''} ${className}`}>
      <label htmlFor={id} className="percent-field__label">
        {label}
      </label>
      <div className="percent-field__control">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        <span className="percent-field__suffix">{suffix}</span>
        {hint && <span className="percent-field__hint">{hint}</span>}
      </div>
      {error && (
        <span id={`${id}-error`} className="field-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

export default PercentField;
