import './Skeleton.css';

// Shimmering placeholder block shown while data loads.
// Mark the surrounding region with aria-busy so screen readers know it's loading.
function Skeleton({ width = '100%', height = 16, radius = 6, className = '', style }) {
  return (
    <span
      className={`skeleton ${className}`}
      // Circles must keep their aspect ratio, so they never shrink.
      style={{ width, height, borderRadius: radius, flexShrink: radius === '50%' ? 0 : undefined, ...style }}
      aria-hidden="true"
    />
  );
}

export default Skeleton;
