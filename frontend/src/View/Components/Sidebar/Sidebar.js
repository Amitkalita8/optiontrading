import panelToggleIcon from '../../Assets/Image/Light/hugeicons_panel-left-open.png';
import MarketStatus from './MarketStatus';
import SidebarItem from './SidebarItem';
import UserMenu from '../UserAuthentication/UserMenu/UserMenu';
import { mainNav, footerNav } from './navConfig';
import './Sidebar.css';

// variant 'docked' (desktop/tablet, optionally collapsed to an icon rail)
// or 'drawer' (mobile, slides in over the page while `open`).
function Sidebar({ variant = 'docked', collapsed = false, open = false, onToggle }) {
  const isDrawer = variant === 'drawer';
  const isCollapsed = !isDrawer && collapsed;
  const classes = [
    'sidebar',
    isCollapsed && 'sidebar--collapsed',
    isDrawer && 'sidebar--drawer',
    isDrawer && open && 'sidebar--open',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <aside className={classes} inert={isDrawer && !open ? true : undefined} aria-label="Main navigation">
      <div className="sidebar__top">
        <MarketStatus compact={isCollapsed} />
        <button
          type="button"
          className="sidebar__toggle"
          onClick={onToggle}
          aria-label={isDrawer ? 'Close menu' : isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
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

      <div className="sidebar__footer">
        <div className="sidebar__divider" />
        {footerNav.map((item) => (
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
