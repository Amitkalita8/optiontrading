import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import KebabButton from '../KebabButton/KebabButton';
import './ActionMenu.css';

// "⋮" button with a dropdown of actions.
// items: [{ label, onSelect, danger?, disabled?, hint? }]
// The menu is position: fixed so table/card overflow can't clip it.
function ActionMenu({ label, items, variant, size }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const wrapRef = useRef(null);
  const menuRef = useRef(null);

  useLayoutEffect(() => {
    if (!open) return;
    const r = wrapRef.current.getBoundingClientRect();
    const below = window.innerHeight - r.bottom > 140;
    setPos({
      right: window.innerWidth - r.right,
      ...(below ? { top: r.bottom + 6 } : { bottom: window.innerHeight - r.top + 6 }),
    });
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    menuRef.current?.querySelector('button:not(:disabled)')?.focus();
    const onDown = (e) => {
      if (!menuRef.current?.contains(e.target) && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        wrapRef.current.querySelector('button')?.focus();
      }
    };
    const close = () => setOpen(false);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [open]);

  return (
    <span ref={wrapRef} className="action-menu">
      <KebabButton
        label={label}
        variant={variant}
        size={size}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      />
      {open && pos && (
        <div ref={menuRef} className="action-menu__list" role="menu" style={pos}>
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              title={item.hint}
              className={`action-menu__item ${item.danger ? 'action-menu__item--danger' : ''}`}
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
            >
              {item.label}
              {item.hint && item.disabled && <small>{item.hint}</small>}
            </button>
          ))}
        </div>
      )}
    </span>
  );
}

export default ActionMenu;
