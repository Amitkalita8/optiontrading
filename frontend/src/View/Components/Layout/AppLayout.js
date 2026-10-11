import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import useMediaQuery, { BREAKPOINTS } from '../../../Controller/useMediaQuery';
import Sidebar from '../Sidebar/Sidebar';
import MobileHeader from '../MobileHeader/MobileHeader';
import MarketAlerts from '../MarketAlerts/MarketAlerts';
import './AppLayout.css';

const SIDEBAR_PREF_KEY = 'sidebarCollapsed';

function readSidebarPref() {
  try {
    const value = localStorage.getItem(SIDEBAR_PREF_KEY);
    return value === null ? null : value === 'true';
  } catch {
    return null;
  }
}

// Desktop: full sidebar on wide screens, icon rail by default below 1680px
// (as in the dashboard design); the user's toggle overrides and is remembered.
// Tablet: icon rail; its toggle slides the full sidebar in over the page.
// Mobile: top bar + slide-in drawer.
function AppLayout() {
  const [userCollapsed, setUserCollapsed] = useState(readSidebarPref);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isMobile = useMediaQuery(BREAKPOINTS.mobile);
  const isTablet = useMediaQuery(BREAKPOINTS.tablet);
  const isCompactDesktop = useMediaQuery(BREAKPOINTS.compactDesktop);
  const { pathname } = useLocation();
  const collapsed = userCollapsed ?? isCompactDesktop;

  const toggleSidebar = () => {
    const next = !collapsed;
    setUserCollapsed(next);
    try {
      localStorage.setItem(SIDEBAR_PREF_KEY, String(next));
    } catch {
      // Storage unavailable (private mode etc.): keep the choice for this session only.
    }
  };

  // Close the drawer after navigating or when the layout changes size class.
  useEffect(() => setDrawerOpen(false), [pathname, isMobile, isTablet]);

  useEffect(() => {
    if (!drawerOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && setDrawerOpen(false);
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  return (
    <div className={`app-layout ${isMobile ? 'app-layout--mobile' : ''}`}>
      {isMobile && <MobileHeader onMenuClick={() => setDrawerOpen(true)} />}

      {/* Tablet keeps the icon rail docked; its toggle opens the drawer. */}
      {!isMobile && (
        <Sidebar
          collapsed={collapsed || isTablet}
          onToggle={isTablet ? () => setDrawerOpen(true) : toggleSidebar}
        />
      )}

      {isTablet && (
        <>
          <div
            className={`app-layout__overlay ${drawerOpen ? 'app-layout__overlay--visible' : ''}`}
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <Sidebar variant="drawer" open={drawerOpen} onToggle={() => setDrawerOpen(false)} />
        </>
      )}

      <MarketAlerts />
      <main className="app-layout__main">
        <Outlet />
      </main>
    </div>
  );
}

export default AppLayout;
