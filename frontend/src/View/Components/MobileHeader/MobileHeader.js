import MarketStatus from '../Sidebar/MarketStatus';
import UserMenu from '../UserAuthentication/UserMenu/UserMenu';
import './MobileHeader.css';

function MobileHeader({ onMenuClick }) {
  return (
    <header className="mobile-header">
      <button type="button" className="mobile-header__menu" onClick={onMenuClick} aria-label="Open menu">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>
      <MarketStatus />
      <UserMenu variant="compact" placement="bottom-end" avatarSize={38} />
    </header>
  );
}

export default MobileHeader;
