import './BrandLogo.css';

// Option Seller mark (same artwork as public/favicon.svg) with optional wordmark.
function BrandLogo({ size = 32, wordmark = true }) {
  return (
    <span className="brand-logo">
      <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
        <rect width="64" height="64" rx="14" fill="#1f7a4d" />
        <path d="M13 49H51" stroke="#c6eed8" strokeWidth="3" strokeLinecap="round" strokeDasharray="1 6" />
        <path d="M13 41 24 30l8 7 17-17" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M38 19h12v12" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {wordmark && <span className="brand-logo__name">Option Seller</span>}
    </span>
  );
}

export default BrandLogo;
