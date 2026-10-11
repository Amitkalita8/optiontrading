import { useEffect } from 'react';
import { useMarketStatus } from '../../../Controller/MarketStatusContext';
import './MarketAlerts.css';

const AUTO_DISMISS_MS = 5 * 60 * 1000;

const ICONS = {
  info: (
    <path d="M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
  ),
  warning: (
    <path d="M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
  ),
  success: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  neutral: <path d="M7 7l10 10M17 7 7 17" />,
};

function MarketAlert({ alert, onDismiss }) {
  useEffect(() => {
    const id = setTimeout(() => onDismiss(alert.id), AUTO_DISMISS_MS);
    return () => clearTimeout(id);
  }, [alert.id, onDismiss]);

  return (
    <div className={`market-alert market-alert--${alert.tone}`} role="alert">
      <span className="market-alert__icon" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {ICONS[alert.tone]}
        </svg>
      </span>
      <div className="market-alert__body">
        <p className="market-alert__title">{alert.title}</p>
        <p className="market-alert__message">{alert.message}</p>
      </div>
      <button type="button" className="market-alert__close" onClick={() => onDismiss(alert.id)} aria-label="Dismiss alert">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>
    </div>
  );
}

// Popup stack for market open/close alerts (top-right; full width on phones).
function MarketAlerts() {
  const { alerts, dismissAlert } = useMarketStatus();
  if (alerts.length === 0) return null;
  return (
    <div className="market-alerts" aria-label="Market alerts">
      {alerts.map((a) => (
        <MarketAlert key={a.id} alert={a} onDismiss={dismissAlert} />
      ))}
    </div>
  );
}

export default MarketAlerts;
