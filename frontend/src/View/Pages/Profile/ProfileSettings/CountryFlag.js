import { useState } from 'react';

// Country flag as an image (emoji flags don't render on Windows). Falls back
// to the ISO code if the image can't load (e.g. offline).
function CountryFlag({ iso, className = '' }) {
  const [failed, setFailed] = useState(false);
  if (!iso) return null;
  if (failed) {
    return (
      <span className={`country-flag country-flag--code ${className}`} aria-hidden="true">
        {iso}
      </span>
    );
  }
  return (
    <img
      className={`country-flag ${className}`}
      src={`https://flagcdn.com/w40/${iso.toLowerCase()}.png`}
      width="22"
      height="16"
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

export default CountryFlag;
