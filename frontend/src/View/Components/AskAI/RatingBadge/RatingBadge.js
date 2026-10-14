import { RATING_LABELS } from '../../../../Model/Screener/stockInsightModel';
import './RatingBadge.css';

const SCALE = ['poor', 'medium', 'good'];

// Good / Medium / Poor verdict with a three-step meter.
function RatingBadge({ rating }) {
  const { label, hint } = RATING_LABELS[rating] ?? RATING_LABELS.medium;
  const level = SCALE.indexOf(rating);

  return (
    <div className={`rating-badge rating-badge--${rating}`}>
      <span className="rating-badge__eyebrow">AI rating</span>
      <span className="rating-badge__label">{label}</span>
      <span className="rating-badge__meter" aria-hidden="true">
        {SCALE.map((s, i) => (
          <span key={s} className={`rating-badge__step ${i <= level ? 'rating-badge__step--on' : ''}`} />
        ))}
      </span>
      <span className="rating-badge__hint">{hint}</span>
    </div>
  );
}

export default RatingBadge;
