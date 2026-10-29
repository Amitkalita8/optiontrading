import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext/AuthContext';
import UserAvatar from '../UserAvatar/UserAvatar';
import { useT } from '../../../../Controller/LocaleContext';
import './UserMenu.css';

// Account button. Opens menu with Profile and Log out options.
// Clicking Profile navigates to /profile; clicking Log out logs out and goes to landing page (/).
function UserMenu({ variant = 'full', placement = 'top-start', avatarSize = 44 }) {
  const { user, logOut } = useAuth();
  const navigate = useNavigate();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  // Sync with locally saved profile customizations if present
  let savedProfile = null;
  try {
    const raw = localStorage.getItem('kushmanda.profileSettings');
    if (raw) savedProfile = JSON.parse(raw);
  } catch {
    // Ignore
  }

  const displayUser = user || {
    name: savedProfile?.fullName || 'Vishu Jain',
    email: savedProfile?.email || 'vishu@kushmanda.ai',
    picture: savedProfile?.photo || null,
    provider: 'local',
  };

  // The menu is position: fixed so it isn't clipped by the sidebar's overflow.
  useLayoutEffect(() => {
    if (!open) return;
    const r = buttonRef.current.getBoundingClientRect();
    setPosition(
      placement === 'bottom-end'
        ? { top: r.bottom + 8, right: window.innerWidth - r.right }
        : { bottom: window.innerHeight - r.top + 8, left: r.left }
    );
  }, [open, placement]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => {
      if (!menuRef.current?.contains(e.target) && !buttonRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const close = () => setOpen(false);
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  const onClick = () => setOpen((o) => !o);
  const label = `Account: ${displayUser.name}`;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={`user-menu user-menu--${variant}`}
        onClick={onClick}
        aria-label={variant === 'compact' ? label : undefined}
        aria-haspopup="menu"
        aria-expanded={open}
        title={variant === 'compact' ? label : undefined}
      >
        <UserAvatar user={displayUser} size={avatarSize} />
        {variant === 'full' && (
          <span className="user-menu__text">
            <span className="user-menu__name">{displayUser.name}</span>
            <span className="user-menu__email">{displayUser.email}</span>
          </span>
        )}
      </button>

      {open && position && (
        <div ref={menuRef} className="user-menu__popover" style={position} role="menu" aria-label={t('menu.account')}>
          <div className="user-menu__header">
            <UserAvatar user={displayUser} size={40} />
            <div className="user-menu__text">
              <span className="user-menu__name">{displayUser.name}</span>
              <span className="user-menu__email">{displayUser.email}</span>
            </div>
          </div>

          <div className="user-menu__actions">
            {/* Option 1: Profile (Settings page matching screenshot) */}
            <button
              type="button"
              role="menuitem"
              className="user-menu__item user-menu__item--profile"
              onClick={() => {
                setOpen(false);
                navigate('/profile');
              }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span>{t('menu.profile')}</span>
            </button>

            {/* Option 2: Log out -> logs out and navigates to landing page (/) */}
            <button
              type="button"
              role="menuitem"
              className="user-menu__item user-menu__item--logout"
              onClick={() => {
                setOpen(false);
                logOut();
                navigate('/');
              }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>{t('menu.logout')}</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default UserMenu;
