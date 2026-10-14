import { Link } from 'react-router-dom';
import BrandLogo from '../../Common/BrandLogo/BrandLogo';
import './LandingNav.css';

const LINKS = [
  { href: '#option-selling', label: 'Option selling' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#product', label: 'Product' },
  { href: '#approach', label: 'Our approach' },
];

// Sticky top bar. Signed-in users get a shortcut to the app instead of auth buttons.
function LandingNav({ signedIn, onLogin, onStart }) {
  return (
    <header className="landing-nav">
      <div className="landing-container landing-nav__inner">
        <Link to="/" className="landing-nav__brand" aria-label="Option Seller home">
          <BrandLogo size={34} />
        </Link>

        <nav className="landing-nav__links" aria-label="Page sections">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href}>
              {l.label}
            </a>
          ))}
        </nav>

        <div className="landing-nav__actions">
          {signedIn ? (
            <Link to="/dashboard" className="btn btn--primary landing-nav__cta">
              Open dashboard
            </Link>
          ) : (
            <>
              <button type="button" className="landing-nav__login" onClick={onLogin}>
                Log in
              </button>
              <button type="button" className="btn btn--primary landing-nav__cta" onClick={onStart}>
                Get started
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default LandingNav;
