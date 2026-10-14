import { useMarketStatus } from '../../../../Controller/MarketStatusContext';
import { hero } from '../../../../Data/landingContent';
import OpportunityPreview from '../OpportunityPreview/OpportunityPreview';
import './Hero.css';

const MARKET_LABEL = {
  open: 'US market open · live data',
  'pre-market': 'Pre-market · live data',
  'after-hours': 'After hours · live data',
  closed: 'US market closed · live data',
};

function Hero({ signedIn, onStart }) {
  const { status } = useMarketStatus();

  return (
    <section className="hero">
      <div className="landing-container hero__inner">
        <div className="hero__copy">
          <p className="landing-eyebrow">{hero.eyebrow}</p>
          <h1 className="hero__title">{hero.title}</h1>
          <p className="hero__subtitle">{hero.subtitle}</p>

          <div className="hero__actions">
            <button type="button" className="btn btn--primary hero__cta" onClick={onStart}>
              {signedIn ? 'Open dashboard' : 'Get started'}
            </button>
            <a href="#how-it-works" className="btn btn--outline-accent hero__secondary">
              See how it works
            </a>
          </div>

          <ul className="hero__points">
            {hero.points.map((p) => (
              <li key={p}>
                <span aria-hidden="true">✓</span>
                {p}
              </li>
            ))}
          </ul>

          {status && (
            <p className={`hero__market hero__market--${status.isOpen ? 'open' : 'closed'}`}>
              <i aria-hidden="true" />
              {MARKET_LABEL[status.phase] ?? 'Live market data'}
            </p>
          )}
        </div>

        <div className="hero__visual">
          <OpportunityPreview />
        </div>
      </div>
    </section>
  );
}

export default Hero;
