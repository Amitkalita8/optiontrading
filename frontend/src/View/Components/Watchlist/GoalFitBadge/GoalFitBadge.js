import './GoalFitBadge.css';

const LABELS = { strong: 'Strong Fit', moderate: 'Moderate Fit', weak: 'Weak Fit' };

// How well a company matches the campaign goal. fit: strong | moderate | weak
function GoalFitBadge({ fit }) {
  return <span className={`goal-fit goal-fit--${fit}`}>{LABELS[fit] ?? fit}</span>;
}

export default GoalFitBadge;
