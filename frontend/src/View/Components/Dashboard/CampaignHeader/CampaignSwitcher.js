import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronIcon } from '../../Icons/FallbackIcons';

const range = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
const period = (c) => {
  const a = new Date(`${c.startDate}T00:00:00Z`);
  const b = new Date(`${c.endDate}T00:00:00Z`);
  return Number.isNaN(a.getTime()) || Number.isNaN(b.getTime()) ? '' : `${range.format(a)} – ${range.format(b)}`;
};

// Campaign name that opens a list of the user's campaigns (dashboard header).
function CampaignSwitcher({ campaigns, activeId, onSelect, busy }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const listRef = useRef(null);
  const listId = useId();
  const current = campaigns.find((c) => c.id === activeId);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => !rootRef.current?.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  useEffect(() => {
    if (open) listRef.current?.focus();
  }, [open]);

  const openMenu = () => {
    setActive(Math.max(0, campaigns.findIndex((c) => c.id === activeId)));
    setOpen(true);
  };

  const choose = (c) => {
    setOpen(false);
    buttonRef.current?.focus();
    if (c && c.id !== activeId) onSelect(c.id);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(campaigns.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      choose(campaigns[active]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      choose(null);
    } else if (e.key === 'Tab') {
      setOpen(false);
    }
  };

  return (
    <div className="campaign-switcher" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className="campaign-header__title"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={(e) => {
          if (!open && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            openMenu();
          }
        }}
      >
        <h1>{current?.name ?? 'Choose a campaign'}</h1>
        <span className={`campaign-switcher__chevron ${open ? 'campaign-switcher__chevron--open' : ''}`}>
          <ChevronIcon direction="down" />
        </span>
        {busy && <span className="campaign-switcher__busy" aria-label="Loading campaign" />}
      </button>

      {open && (
        <div className="campaign-switcher__menu">
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            tabIndex={-1}
            aria-label="Campaigns"
            aria-activedescendant={`${listId}-${active}`}
            onKeyDown={onKeyDown}
          >
            {campaigns.map((c, i) => (
              <li
                key={c.id}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={c.id === activeId}
                className={[
                  'campaign-switcher__option',
                  c.id === activeId && 'campaign-switcher__option--selected',
                  i === active && 'campaign-switcher__option--active',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(c)}
              >
                <span className="campaign-switcher__name">{c.name}</span>
                {period(c) && <span className="campaign-switcher__dates">{period(c)}</span>}
              </li>
            ))}
          </ul>
          <Link to="/onboarding" className="campaign-switcher__new">
            + New campaign
          </Link>
        </div>
      )}
    </div>
  );
}

export default CampaignSwitcher;
