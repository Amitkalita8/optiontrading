import { Link } from 'react-router-dom';
import './ControlBanner.css';

function ControlBanner() {
  return (
    <div className="control-banner">
      <span className="control-banner__check" aria-hidden="true">✓</span>
      <p>
        <b>You&apos;re in control.</b> Your goals, risk limits and rules are always applied, so you can trade with
        clarity, not emotion.
      </p>
      <Link to="/opportunities" className="control-banner__link">
        ☆ Explore New Opportunities →
      </Link>
    </div>
  );
}

export default ControlBanner;
