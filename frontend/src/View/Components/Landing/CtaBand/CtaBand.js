import { Link } from 'react-router-dom';
import './CtaBand.css';

function CtaBand({ signedIn, onStart }) {
  return (
    <section className="landing-section">
      <div className="landing-container">
        <div className="cta-band">
          <div>
            <h2>Bring structure to your option selling</h2>
            <p>Start with a campaign and an approach — the AI screener takes it from there.</p>
          </div>
          <div className="cta-band__actions">
            <button type="button" className="btn cta-band__primary" onClick={onStart}>
              {signedIn ? 'Open dashboard' : 'Create your first campaign'}
            </button>
            <Link to="/dashboard" className="cta-band__secondary">
              Explore the dashboard →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default CtaBand;
