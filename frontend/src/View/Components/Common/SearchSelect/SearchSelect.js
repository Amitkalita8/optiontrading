import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import './SearchSelect.css';

const Chevron = () => (
  <svg className="search-select__chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

// Space the popup needs; with less room below the trigger it opens upward.
const POPUP_SPACE = 330;

/**
 * Dropdown with an optional search box (Settings › Profile).
 * options: [{ value, label, hint?, search? }]; `search` is the lower-case text
 * the query matches (defaults to the label). renderIcon(option) adds e.g. a flag.
 */
function SearchSelect({
  id,
  label,
  value,
  options,
  onChange,
  searchable = false,
  searchPlaceholder,
  noResults = 'No matches',
  renderIcon,
  error,
}) {
  const autoId = useId();
  const baseId = id ?? autoId;
  const listId = `${baseId}-list`;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [placement, setPlacement] = useState('below');
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const searchRef = useRef(null);
  const listRef = useRef(null);

  const selected = options.find((o) => o.value === value);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => (o.search ?? o.label.toLowerCase()).includes(q)) : options;
  }, [options, query]);

  const openList = () => {
    const r = triggerRef.current.getBoundingClientRect();
    setPlacement(window.innerHeight - r.bottom < POPUP_SPACE && r.top > POPUP_SPACE ? 'above' : 'below');
    setQuery('');
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  };

  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  };

  const choose = (option) => {
    if (option) onChange(option.value);
    close();
  };

  // Focus the search box (or the list) when opening.
  useLayoutEffect(() => {
    if (!open) return;
    (searchable ? searchRef.current : listRef.current)?.focus();
  }, [open, searchable]);

  // Keep the active option visible.
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => !rootRef.current?.contains(e.target) && close(false);
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const onKeyDown = (e) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActive((i) => Math.min(filtered.length - 1, i + 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActive((i) => Math.max(0, i - 1));
        break;
      case 'Home':
        if (!searchable) {
          e.preventDefault();
          setActive(0);
        }
        break;
      case 'End':
        if (!searchable) {
          e.preventDefault();
          setActive(filtered.length - 1);
        }
        break;
      case 'Enter':
        e.preventDefault();
        choose(filtered[active]);
        break;
      case 'Escape':
        e.preventDefault();
        close();
        break;
      case 'Tab':
        close(false);
        break;
      default:
    }
  };

  const onTriggerKey = (e) => {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
      e.preventDefault();
      openList();
    }
  };

  const activeId = filtered[active] ? `${baseId}-opt-${active}` : undefined;

  return (
    <div className={`search-select ${error ? 'search-select--error' : ''}`} ref={rootRef}>
      {label && (
        <label className="search-select__label" htmlFor={baseId}>
          {label}
        </label>
      )}
      <div className="search-select__anchor">
      <button
        ref={triggerRef}
        id={baseId}
        type="button"
        className="search-select__trigger"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-invalid={Boolean(error)}
        onClick={() => (open ? close() : openList())}
        onKeyDown={onTriggerKey}
      >
        {selected && renderIcon?.(selected)}
        <span className="search-select__value">{selected?.label ?? value}</span>
        <Chevron />
      </button>

      {open && (
        <div className={`search-select__popup search-select__popup--${placement}`}>
          {searchable && (
            <label className="search-select__search">
              <SearchIcon />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                onKeyDown={onKeyDown}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                aria-controls={listId}
                aria-activedescendant={activeId}
                autoComplete="off"
                spellCheck="false"
              />
            </label>
          )}
          <ul
            ref={listRef}
            id={listId}
            className="search-select__list"
            role="listbox"
            aria-label={label}
            tabIndex={-1}
            aria-activedescendant={searchable ? undefined : activeId}
            onKeyDown={searchable ? undefined : onKeyDown}
          >
            {filtered.length === 0 && <li className="search-select__empty">{noResults}</li>}
            {filtered.map((o, i) => (
              <li
                key={o.value}
                id={`${baseId}-opt-${i}`}
                data-index={i}
                role="option"
                aria-selected={o.value === value}
                className={[
                  'search-select__option',
                  o.value === value && 'search-select__option--selected',
                  i === active && 'search-select__option--active',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(o)}
              >
                {renderIcon?.(o)}
                <span className="search-select__option-label">{o.label}</span>
                {o.hint && <span className="search-select__hint">{o.hint}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
      </div>
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}

export default SearchSelect;
