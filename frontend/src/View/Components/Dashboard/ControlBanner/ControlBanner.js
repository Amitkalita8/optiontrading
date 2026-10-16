import { Link } from 'react-router-dom';
import './ControlBanner.css';

function ControlBanner() {
  return (
    <div className="control-banner">
      <span className="control-banner__check" aria-hidden="true">✓</span>
      <p>
        <b>You&apos;re in control.</b> Your goals, risk limits and rules are always applied, so you never trade without clarity and intention.
      </p>
    </div>
  );
}

export default ControlBanner;
