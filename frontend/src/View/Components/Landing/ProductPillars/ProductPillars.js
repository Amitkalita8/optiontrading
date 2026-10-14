import { Link } from 'react-router-dom';
import { pillars } from '../../../../Data/landingContent';
import campaignIcon from '../../../Assets/Image/Dark/basil_bullhorn-solid.png';
import screenerIcon from '../../../Assets/Image/Dark/fluent_sparkle-20-filled.png';
import opportunitiesIcon from '../../../Assets/Image/Dark/fluent_task-list-square-sparkle-20-filled.png';
import { BookIcon, TradeLogIcon } from '../../Icons/FallbackIcons';
import './ProductPillars.css';

// Same icons as the app's sidebar, so the landing page and product feel like one.
const ICONS = {
  campaign: <img src={campaignIcon} alt="" />,
  screener: <img src={screenerIcon} alt="" />,
  opportunities: <img src={opportunitiesIcon} alt="" />,
  watchlist: <BookIcon filled />,
  tradeLog: <TradeLogIcon filled />,
};

function ProductPillars() {
  return (
    <section id="product" className="landing-section landing-section--white">
      <div className="landing-container">
        <div className="landing-heading">
          <p className="landing-eyebrow">The product</p>
          <h2 className="landing-h2">Five parts, one decision-support workspace</h2>
          <p className="landing-lead">Everything an option seller needs between having a plan and closing a position.</p>
        </div>

        <ul className="pillars">
          {pillars.map((p) => (
            <li key={p.title} className="pillar">
              <span className="pillar__icon" aria-hidden="true">
                {ICONS[p.icon]}
              </span>
              <h3>{p.title}</h3>
              <p>{p.text}</p>
              <Link to={p.to} className="pillar__link">
                Open {p.title} →
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default ProductPillars;
