import { useLocation, useNavigate, Link } from 'react-router-dom';
import panelToggleIcon from '../../Assets/Image/Light/hugeicons_panel-left-open.png';
import MarketStatus from './MarketStatus';
import SidebarItem from './SidebarItem';
import UserMenu from '../UserAuthentication/UserMenu/UserMenu';
import { mainNav, footerNav } from './navConfig';
import { settingsNavItems } from './settingsNavConfig';
import { useT } from '../../../Controller/LocaleContext';
import './Sidebar.css';

// variant 'docked' (desktop/tablet, optionally collapsed to an icon rail)
// or 'drawer' (mobile, slides in over the page while `open`).
function Sidebar({ variant = 'docked', collapsed = false, open = false, onToggle }) {
  const isDrawer = variant === 'drawer';
  const isCollapsed = !isDrawer && collapsed;
  const location = useLocation();
  const navigate = useNavigate();
  const t = useT();

  // Mode: regular app navigation vs. Settings/Profile navigation
  const isSettingsMode =
    location.pathname.startsWith('/profile') || location.pathname.startsWith('/settings');

  const classes = [
    'sidebar',
    isCollapsed && 'sidebar--collapsed',
    isDrawer && 'sidebar--drawer',
    isDrawer && open && 'sidebar--open',
    isSettingsMode && 'sidebar--settings-mode',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <aside className={classes} inert={isDrawer && !open ? true : undefined} aria-label={t('nav.main')}>
      {/* Settings Mode Top Bar: Go back + panel toggle */}
      {isSettingsMode ? (
        <div className="sidebar__top sidebar__top--settings">
          <button
            type="button"
            className="sidebar__back-btn"
            onClick={() => navigate('/dashboard')}
            aria-label={t('nav.goBackTitle')}
            title={t('nav.goBackTitle')}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            {!isCollapsed && <span>{t('nav.goBack')}</span>}
          </button>

          <button
            type="button"
            className="sidebar__toggle"
            onClick={onToggle}
            aria-label={t(isDrawer ? 'nav.closeMenu' : isCollapsed ? 'nav.expandSidebar' : 'nav.collapseSidebar')}
          >
            {isDrawer ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="4" />
                <line x1="15" y1="3" x2="15" y2="21" />
              </svg>
            )}
          </button>
        </div>
      ) : (
        /* Regular Navigation Top Bar */
        <div className="sidebar__top">
          {!isCollapsed && <MarketStatus />}
          <button
            type="button"
            className="sidebar__toggle"
            onClick={onToggle}
            aria-label={t(isDrawer ? 'nav.closeMenu' : isCollapsed ? 'nav.expandSidebar' : 'nav.collapseSidebar')}
          >
            {isDrawer ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            ) : (
              <img src={panelToggleIcon} alt="" />
            )}
          </button>
        </div>
      )}

      {/* Navigation Body */}
      {isSettingsMode ? (
        /* Settings Nav Items (PROFILE, BROKER ACCOUNTS, etc.) */
        <nav className="sidebar__nav sidebar__nav--settings">
          {settingsNavItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.path === '/profile'
                ? location.pathname === '/profile' ||
                  location.pathname === '/settings' ||
                  location.pathname === '/settings/profile'
                : location.pathname.startsWith(item.path);

            return (
              <Link
                key={item.label}
                to={item.path}
                className={`sidebar-settings-item ${
                  isActive ? 'sidebar-settings-item--active' : ''
                }`}
                title={isCollapsed ? t(item.labelKey) : undefined}
              >
                <span className="sidebar-settings-item__icon">
                  <Icon active={isActive} />
                </span>
                {!isCollapsed && (
                  <span className="sidebar-settings-item__label">{t(item.labelKey)}</span>
                )}
              </Link>
            );
          })}
        </nav>
      ) : (
        /* Regular App Nav Items */
        <nav className="sidebar__nav">
          {mainNav.map((item) => (
            <SidebarItem
              key={item.path ?? item.label}
              item={item}
              collapsed={isCollapsed}
              onExpand={onToggle}
            />
          ))}
        </nav>
      )}

      {/* Footer Area */}
      <div className="sidebar__footer">
        <div className="sidebar__divider" />
        {!isSettingsMode &&
          footerNav.map((item) => (
            <SidebarItem key={item.path} item={item} collapsed={isCollapsed} />
          ))}
        <div className="sidebar__account">
          <UserMenu variant={isCollapsed ? 'compact' : 'full'} placement="top-start" />
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
