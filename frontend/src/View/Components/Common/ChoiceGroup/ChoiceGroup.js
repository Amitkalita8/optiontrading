import { useId, useRef, useState } from 'react';
import './ChoiceGroup.css';

const CUSTOM = '__custom__';

// Pill radio group (design: "ITM | ATM | OTM"). Arrow keys move the selection.
// options: [{ value, label }]. With `custom` ({ label, suffix, min, max, step }),
// a "Custom" pill appears; picking it (or a value not in options) shows a
// number input for the exact value. Remount (key) to reset when the form is
// reloaded with different values.
function ChoiceGroup({ label, options, value, onChange, custom, error }) {
  const id = useId();
  const groupRef = useRef(null);
  // Explicit "Custom" choice, even while the number still equals a preset.
  const [customChosen, setCustomChosen] = useState(false);
  const isCustom = Boolean(custom) && (customChosen || !options.some((o) => o.value === value));
  const items = custom ? [...options, { value: CUSTOM, label: custom.label ?? 'Custom' }] : options;
  const selected = isCustom ? CUSTOM : value;

  const choose = (v) => {
    if (v === CUSTOM) {
      // Keep the current number so it can be edited.
      setCustomChosen(true);
    } else {
      setCustomChosen(false);
      onChange(v);
    }
  };

  const onKeyDown = (e) => {
    const delta = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!delta) return;
    e.preventDefault();
    const i = items.findIndex((o) => o.value === selected);
    const next = items[(i + delta + items.length) % items.length];
    choose(next.value);
    groupRef.current.querySelector(`[data-value="${CSS.escape(String(next.value))}"]`)?.focus();
  };

  return (
    <div className="choice-group">
      {label && (
        <span className="choice-group__label" id={`${id}-label`}>
          {label}
        </span>
      )}
      <div
        ref={groupRef}
        className={`choice-group__pills ${error ? 'choice-group__pills--error' : ''}`}
        role="radiogroup"
        aria-labelledby={label ? `${id}-label` : undefined}
        onKeyDown={onKeyDown}
      >
        {items.map((o) => {
          const checked = o.value === selected;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={checked ? 0 : -1}
              data-value={o.value}
              className={`choice-group__pill ${checked ? 'choice-group__pill--active' : ''}`}
              onClick={() => choose(o.value)}
            >
              {o.label}
            </button>
          );
        })}
      </div>

      {isCustom && (
        <label className="choice-group__custom">
          <span>Custom value</span>
          <input
            type="number"
            inputMode="decimal"
            min={custom.min}
            max={custom.max}
            step={custom.step ?? 1}
            value={value}
            onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
            aria-label={`${label} custom value`}
          />
          {custom.suffix && <span>{custom.suffix}</span>}
        </label>
      )}
      {error && (
        <span className="field-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

export default ChoiceGroup;
