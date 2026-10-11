import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useAuth } from '../AuthContext/AuthContext';
import UserAvatar from '../UserAvatar/UserAvatar';
import './UserMenu.css';

// Account button. Signed out: opens the login popup. Signed in: toggles a menu
// with the user's details and Log out.
// variant 'full' shows name/email beside the avatar (expanded sidebar);
// 'compact' is the avatar alone (icon rail, mobile header).
// placement: 'top-start' (menu opens above, sidebar) | 'bottom-end' (below, header).
function UserMenu({ variant = 'full', placement = 'top-start', avatarSize = 44 }) {
  const { user, openAuth, logOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

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
        buttonRef.current.focus();
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

  const onClick = () => (user ? setOpen((o) => !o) : openAuth('login'));
  const label = user ? `Account: ${user.name}` : 'Log in or sign up';

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={`user-menu user-menu--${variant}`}
        onClick={onClick}
        aria-label={variant === 'compact' ? label : undefined}
        aria-haspopup={user ? 'menu' : 'dialog'}
        aria-expanded={user ? open : undefined}
        title={variant === 'compact' ? label : undefined}
      >
        <UserAvatar user={user} size={avatarSize} />
        {variant === 'full' && (
          <span className="user-menu__text">
            {user ? (
              <>
                <span className="user-menu__name">{user.name}</span>
                <span className="user-menu__email">{user.email}</span>
              </>
            ) : (
              <>
                <span className="user-menu__name">Log in</span>
                <span className="user-menu__email">or create an account</span>
              </>
            )}
          </span>
        )}
      </button>

      {open && user && position && (
        <div ref={menuRef} className="user-menu__popover" style={position} role="menu" aria-label="Account">
          <div className="user-menu__header">
            <UserAvatar user={user} size={40} />
            <div className="user-menu__text">
              <span className="user-menu__name">{user.name}</span>
              <span className="user-menu__email">{user.email}</span>
              <span className="user-menu__provider">
                {user.provider === 'google' ? 'Signed in with Google' : 'Signed in with email'}
              </span>
            </div>
          </div>
          <button
            type="button"
            role="menuitem"
            className="user-menu__item"
            onClick={() => {
              setOpen(false);
              logOut();
            }}
          >
            Log out
          </button>
        </div>
      )}
    </>
  );
}

export default UserMenu;
