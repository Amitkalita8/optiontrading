import './KebabButton.css';

// "⋮" menu trigger. variant 'accent' has the green outline used in card headers;
// size 'lg' is the header version, 'md' sits in table rows.
function KebabButton({ label, variant = 'plain', size = 'md', className = '', ...props }) {
  return (
    <button
      type="button"
      className={`kebab-btn kebab-btn--${variant} kebab-btn--${size} ${className}`}
      aria-label={label}
      {...props}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <circle cx="12" cy="5" r="1.8" />
        <circle cx="12" cy="12" r="1.8" />
        <circle cx="12" cy="19" r="1.8" />
      </svg>
    </button>
  );
}

export default KebabButton;
