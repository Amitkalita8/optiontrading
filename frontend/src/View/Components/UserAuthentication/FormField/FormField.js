import { useId } from 'react';
import './FormField.css';

// Labelled input with optional hint, error and trailing control (e.g. show/hide).
function FormField({ label, hint, error, trailing, ...inputProps }) {
  const id = useId();
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`form-field ${error ? 'form-field--error' : ''}`}>
      <label htmlFor={id} className="form-field__label">
        {label}
      </label>
      <div className="form-field__control">
        <input id={id} className="form-field__input" aria-invalid={Boolean(error)} aria-describedby={describedBy} {...inputProps} />
        {trailing}
      </div>
      {hint && !error && (
        <span id={`${id}-hint`} className="form-field__hint">
          {hint}
        </span>
      )}
      {error && (
        <span id={`${id}-error`} className="form-field__error">
          {error}
        </span>
      )}
    </div>
  );
}

export default FormField;
