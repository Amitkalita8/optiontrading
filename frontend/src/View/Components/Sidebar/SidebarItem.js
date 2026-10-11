import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import NavIcon from '../Icons/NavIcon';
import { ChevronIcon } from '../Icons/FallbackIcons';

const matches = (path, pathname) => (path === '/' ? pathname === '/' : pathname.startsWith(path));

// Single nav link; `sub` renders it as a child row inside a group.
function NavItemLink({ item, collapsed, sub = false }) {
  const { pathname } = useLocation();
  const isActive = matches(item.path, pathname);
  const base = sub && !collapsed ? 'sidebar-subitem' : 'sidebar-item';
  return (
    <NavLink
      to={item.path}
      className={`${base} ${isActive ? `${base}--active` : ''}`}
      title={collapsed ? item.label : undefined}
      end={item.path === '/'}
    >
      <NavIcon icon={item.icon} active={isActive} />
      {!collapsed && <span className="sidebar-item__label">{item.label}</span>}
      {item.hasBadge && <span className="sidebar-item__badge" aria-label="New notifications" />}
    </NavLink>
  );
}

// Group with children (AI Screeners → Trade Approach, Watchlists).
// Expanded: header toggles the child list. Icon rail: the header icon asks the
// sidebar to expand, and each child shows as its own icon below it.
function NavGroup({ item, collapsed, onExpand }) {
  const { pathname } = useLocation();
  const childActive = item.children.some((c) => matches(c.path, pathname));
  const [open, setOpen] = useState(true);

  if (collapsed) {
    return (
      <div className="sidebar-group sidebar-group--rail">
        <button
          type="button"
          className={`sidebar-item ${childActive ? 'sidebar-item--within' : ''}`}
          title={`${item.label} — expand menu`}
          aria-label={`${item.label}: expand menu`}
          onClick={onExpand}
        >
          <NavIcon icon={item.icon} active={false} />
        </button>
        {item.children.map((child) => (
          <NavItemLink key={child.path} item={child} collapsed sub />
        ))}
      </div>
    );
  }

  return (
    <div className="sidebar-group">
      <button
        type="button"
        className={`sidebar-item ${childActive ? 'sidebar-item--within' : ''}`}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <NavIcon icon={item.icon} active={false} />
        <span className="sidebar-item__label">{item.label}</span>
        <span className="sidebar-item__chevron">
          <ChevronIcon direction={open ? 'up' : 'down'} />
        </span>
      </button>
      {open && (
        <div className="sidebar-group__children">
          {item.children.map((child) => (
            <NavItemLink key={child.path} item={child} sub />
          ))}
        </div>
      )}
    </div>
  );
}

function SidebarItem({ item, collapsed, onExpand }) {
  return item.children ? (
    <NavGroup item={item} collapsed={collapsed} onExpand={onExpand} />
  ) : (
    <NavItemLink item={item} collapsed={collapsed} />
  );
}

export default SidebarItem;
