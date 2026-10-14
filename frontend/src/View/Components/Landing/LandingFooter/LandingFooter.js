import { Link } from 'react-router-dom';
import { disclaimer } from '../../../../Data/landingContent';
import BrandLogo from '../../Common/BrandLogo/BrandLogo';
import './LandingFooter.css';

const LINKS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/campaigns', label: 'Campaigns' },
  { to: '/trade-approaches', label: 'Trade Approaches' },
  { to: '/watchlist', label: 'Watchlists' },
  { to: '/opportunities', label: 'Opportunities' },
];

function LandingFooter() {
  return (
    <footer className="landing-footer">
      <div className="landing-container">
        <div className="landing-footer__top">
          <div className="landing-footer__brand">
            <BrandLogo size={30} />
            <p>A research and decision-support platform for option sellers.</p>
          </div>
          <nav aria-label="Product">
            <ul>
              {LINKS.map((l) => (
                <li key={l.to}>
                  <Link to={l.to}>{l.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <p className="landing-footer__disclaimer">{disclaimer}</p>
        <p className="landing-footer__copy">© {new Date().getFullYear()} Option Seller</p>
      </div>
    </footer>
  );
}

export default LandingFooter;
