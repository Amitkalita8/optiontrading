import './Toggle.css';

// On/off switch. Pass `label` (visually hidden) or `aria-labelledby`.
function Toggle({ checked, onChange, label, disabled = false, ...aria }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={`toggle ${checked ? 'toggle--on' : ''}`}
      onClick={() => onChange(!checked)}
      {...aria}
    >
      <span className="toggle__thumb" aria-hidden="true" />
    </button>
  );
}

export default Toggle;
