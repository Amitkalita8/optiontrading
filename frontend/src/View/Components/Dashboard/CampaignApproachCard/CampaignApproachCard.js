import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../../Common/Card/Card';
import SearchSelect from '../../Common/SearchSelect/SearchSelect';
import './CampaignApproachCard.css';

const Check = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);

// "Covered Call +2"
const summary = (values, options) => {
  const labels = values.map((v) => options.find((o) => o.value === v)?.label ?? v);
  return labels.length === 0 ? 'None' : labels.length === 1 ? labels[0] : `${labels[0]} +${labels.length - 1}`;
};

// Strategy multi-select: each option has a checkbox on the right; at least
// one strategy stays selected. Changes save as you tick.
function StrategyMenu({ value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const toggle = (v) => {
    const next = value.includes(v) ? value.filter((x) => x !== v) : [...value, v];
    if (next.length) onChange(next);
  };

  return (
    <div className="search-select strategy-menu" ref={ref}>
      <span className="search-select__label" id="strategy-menu-label">
        Strategy
      </span>
      <div className="search-select__anchor">
        <button
          ref={buttonRef}
          type="button"
          className="search-select__trigger"
          aria-haspopup="true"
          aria-expanded={open}
          aria-labelledby="strategy-menu-label"
          onClick={() => setOpen((o) => !o)}
        >
          <span className="search-select__value">{summary(value, options)}</span>
          <svg className="search-select__chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
        {open && (
          <div
            className="search-select__popup search-select__popup--below strategy-menu__popup"
            role="group"
            aria-labelledby="strategy-menu-label"
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setOpen(false);
                buttonRef.current?.focus();
              }
            }}
          >
            {options.map((o) => {
              const checked = value.includes(o.value);
              const locked = checked && value.length === 1;
              return (
                <label key={o.value} className={`strategy-menu__option ${locked ? 'strategy-menu__option--locked' : ''}`} title={locked ? 'Keep at least one strategy' : undefined}>
                  <span>{o.label}</span>
                  <input type="checkbox" className="visually-hidden" checked={checked} disabled={locked} onChange={() => toggle(o.value)} />
                  <span className={`strategy-menu__box ${checked ? 'strategy-menu__box--on' : ''}`} aria-hidden="true">
                    {checked && <Check />}
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// The active campaign's approach settings (saved on the campaign).
// "Set Approach" copies a saved trade approach's values into the campaign.
function CampaignApproachCard({ campaign, approach, approaches = [], options, onChange, onSetApproach, saving }) {
  const [menu, setMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menu) return undefined;
    const close = (e) => !menuRef.current?.contains(e.target) && setMenu(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menu]);

  const set = (field) => (value) => onChange({ [field]: value });

  return (
    <Card className="campaign-approach-card">
      <div className="campaign-approach-card__header">
        <div>
          <h2 className="card__title">Campaign Approach</h2>
          {(approach || saving) && (
            <p className="campaign-approach-card__using">
              {approach && (
                <>
                  Based on <Link to={`/trade-approaches/${approach.id}/edit`}>{approach.name}</Link>
                </>
              )}
              {saving && <span className="campaign-approach-card__saving">{approach ? ' · ' : ''}Saving…</span>}
            </p>
          )}
        </div>
        <div className="campaign-approach-card__set" ref={menuRef}>
          <button type="button" className="campaign-approach-card__set-btn" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
            Set Approach
          </button>
          {menu && (
            <div className="campaign-approach-card__menu" role="menu">
              <p className="campaign-approach-card__menu-hint">Copy a saved approach&apos;s settings into this campaign.</p>
              {approaches.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={a.id === approach?.id}
                  className={a.id === approach?.id ? 'is-current' : ''}
                  onClick={() => {
                    setMenu(false);
                    onSetApproach(a.id);
                  }}
                >
                  {a.name}
                </button>
              ))}
              <Link to="/trade-approaches/new" className="campaign-approach-card__new" role="menuitem">
                + Create new approach
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="campaign-approach-card__fields">
        <StrategyMenu value={campaign.strategies ?? []} options={options.strategies} onChange={set('strategies')} />
        <SearchSelect label="Moneyness" value={campaign.moneyness} options={options.moneyness} onChange={set('moneyness')} />
        <SearchSelect label="Holding Duration" value={campaign.holdingDuration} options={options.holdingDurations} onChange={set('holdingDuration')} />
        <SearchSelect label="Market Outlook" value={campaign.marketOutlook} options={options.outlooks} onChange={set('marketOutlook')} />
        <SearchSelect label="Risk" value={campaign.risk} options={options.risks} onChange={set('risk')} />
      </div>
    </Card>
  );
}

export default CampaignApproachCard;
