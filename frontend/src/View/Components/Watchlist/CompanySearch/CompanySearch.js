import { useId, useMemo, useState } from 'react';
import { searchCompanies } from '../../../../Model/Companies/companyModel';
import TickerLogo from '../../Common/TickerLogo/TickerLogo';
import './CompanySearch.css';

// Ticker/company search with a keyboard-navigable results list (combobox pattern).
// Companies in `exclude` (already added) are left out of the results.
function CompanySearch({ exclude, onPick }) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const listId = useId();

  const results = useMemo(() => searchCompanies(query, { exclude }), [query, exclude]);
  const showList = open && query.trim() !== '';

  const pick = (company) => {
    onPick(company.ticker);
    setQuery('');
    setActive(0);
  };

  const onKeyDown = (e) => {
    if (!showList) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[active]) {
      e.preventDefault();
      pick(results[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="company-search">
      <div className="company-search__field">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          role="combobox"
          aria-label="Search companies or tickers"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && results[active] ? `${listId}-${active}` : undefined}
          placeholder="Search companies or tickers..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
          autoComplete="off"
        />
      </div>

      {showList && (
        <ul id={listId} role="listbox" className="company-search__results">
          {results.length === 0 ? (
            <li className="company-search__empty">No companies match “{query.trim()}”.</li>
          ) : (
            results.map((c, i) => (
              <li
                key={c.ticker}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                className={`company-search__option ${i === active ? 'company-search__option--active' : ''}`}
                // mousedown (not click) so the input's blur doesn't close the list first
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(c);
                }}
                onMouseEnter={() => setActive(i)}
              >
                <TickerLogo ticker={c.ticker} size={28} />
                <b>{c.ticker}</b>
                <span>{c.name}</span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

export default CompanySearch;
