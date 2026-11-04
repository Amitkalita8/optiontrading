import { Link } from 'react-router-dom';
import BrandLogo from '../../Common/BrandLogo/BrandLogo';
import preview from '../../../Assets/Image/auth-dashboard-preview.png';
import './AuthLayout.css';

// Two-panel card used by every sign-in / sign-up / password page: brand
// panel with a dashboard preview on the left, the form on the right.
// `wide` drops the brand panel (e.g. "Connect your broker").
function AuthLayout({ children, wide = false, aside }) {
  if (wide) {
    return (
      <div className="auth-page auth-page--wide">
        <div className="auth-page__wide-top">
          <Link to="/" aria-label="Option Seller home">
            <BrandLogo size={30} />
          </Link>
          {aside}
        </div>
        <main className="auth-page__wide-body">{children}</main>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <aside className="auth-card__brand" aria-hidden="false">
          <Link to="/" className="auth-card__logo" aria-label="Option Seller home">
            <BrandLogo size={30} />
          </Link>
          <span className="auth-card__stripes" aria-hidden="true" />
          <div className="auth-card__monitor" aria-hidden="true">
            <div className="auth-card__screen">
              <img src={preview} alt="" />
            </div>
            <div className="auth-card__neck" />
            <div className="auth-card__base" />
          </div>
          <div className="auth-card__pitch">
            <h2>Trade with a Clearer Edge</h2>
            <p>Discover options opportunities, evaluate strategies, and manage positions with AI-powered insights.</p>
          </div>
          <span className="auth-card__dots" aria-hidden="true" />
        </aside>
        <main className="auth-card__form">{children}</main>
      </div>
    </div>
  );
}

export default AuthLayout;
