import { useEffect, useRef, useState } from 'react';
import { useLocale } from '../../../../Controller/LocaleContext';
import { BILLING } from '../../../../Data/settingsContent';
import '../SettingsSection.css';
import './PlanBilling.css';

const CardIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M3 14h18" />
  </svg>
);

// Invoice row actions (kebab menu).
function InvoiceMenu({ invoice, onAction }) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const items = invoice.status === 'Failed' ? ['billing.retry', 'billing.download'] : ['billing.download', 'billing.receipt'];

  return (
    <div className="billing-menu" ref={ref}>
      <button
        type="button"
        className="billing-menu__trigger"
        aria-label={t('billing.actionsFor', { id: invoice.id })}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="5" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="12" cy="19" r="1.8" />
        </svg>
      </button>
      {open && (
        <div className="billing-menu__list" role="menu">
          {items.map((key) => (
            <button
              key={key}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onAction(`${t(key)}: ${invoice.id}`);
              }}
            >
              {t(key)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Settings › Plan & Billing. Static until a billing provider is connected,
// so actions confirm with a toast instead of changing anything.
function PlanBilling({ onNotice }) {
  const { t, formatDate, formatNumber } = useLocale();
  const notice = (msg) => onNotice?.(msg);
  const usd = (n) => formatNumber(n, { style: 'currency', currency: 'USD' });
  const { plan, price, nextBillingDate, paymentMethods, invoices } = BILLING;

  const overview = [
    { label: t('billing.price'), value: usd(price) },
    { label: t('billing.nextDate'), value: formatDate(nextBillingDate) },
    { label: t('billing.nextAmount'), value: usd(price) },
    { label: t('billing.cycle'), value: t('billing.monthly') },
  ];

  return (
    <div className="settings-tab">
      <header>
        <h1 className="settings-tab__title">{t('settings.billing')}</h1>
        <p className="settings-tab__subtitle">{t('billing.subtitle')}</p>
      </header>

      <section className="settings-card billing-plan" aria-labelledby="billing-plan">
        <div className="billing-plan__text">
          <h2 id="billing-plan" className="settings-card__title">{t('billing.currentPlan')}</h2>
          <p className="billing-plan__name">{plan.name}</p>
          <p className="billing-plan__note">{t('billing.planNote')}</p>
        </div>
        <div className="billing-plan__side">
          <span className="billing-pill">{t('common.active')}</span>
          <button type="button" className="settings-soft-btn" onClick={() => notice(t('billing.managePlanSoon'))}>
            {t('billing.managePlan')}
          </button>
        </div>
      </section>

      <section className="settings-card" aria-labelledby="billing-overview">
        <h2 id="billing-overview" className="settings-card__title">{t('billing.overview')}</h2>
        <dl className="billing-overview">
          {overview.map((o) => (
            <div key={o.label}>
              <dt>{o.label}</dt>
              <dd>{o.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="settings-card" aria-labelledby="billing-payment">
        <h2 id="billing-payment" className="settings-card__title">{t('billing.payment')}</h2>
        <p className="settings-card__lead">{t('billing.paymentLead')}</p>
        <ul className="billing-methods">
          {paymentMethods.map((m) => (
            <li key={m.id} className="billing-method">
              <span className="billing-method__icon">
                <CardIcon />
              </span>
              <div className="billing-method__text">
                <p className="billing-method__name">
                  {t('billing.creditCard')} <span aria-label={t('billing.endingIn')}>••••</span> {m.last4}
                  {m.isDefault && <span className="billing-pill">{t('billing.default')}</span>}
                </p>
                <p className="billing-method__note">{t('billing.paymentNote')}</p>
              </div>
              <button
                type="button"
                className="settings-soft-btn"
                onClick={() => notice(t('billing.updatePaymentSoon', { last4: m.last4 }))}
              >
                {t('billing.updatePayment')}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="settings-card" aria-labelledby="billing-history">
        <h2 id="billing-history" className="settings-card__title">{t('billing.history')}</h2>
        <p className="settings-card__lead">{t('billing.historyLead')}</p>
        <div className="billing-table__scroll">
          <table className="billing-table">
            <thead>
              <tr>
                <th>{t('billing.invoice')}</th>
                <th>{t('billing.date')}</th>
                <th>{t('billing.description')}</th>
                <th>{t('billing.amount')}</th>
                <th>{t('billing.status')}</th>
                <th className="billing-table__actions">{t('billing.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td>{inv.id}</td>
                  <td>{formatDate(inv.date)}</td>
                  <td>{t('billing.invoiceDesc')}</td>
                  <td>{usd(inv.amount)}</td>
                  <td>
                    <span className={`billing-status billing-status--${inv.status.toLowerCase()}`}>
                      {t(`billing.${inv.status}`)}
                    </span>
                  </td>
                  <td className="billing-table__actions">
                    <InvoiceMenu invoice={inv} onAction={notice} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="billing-footnote">{t('billing.footnote')}</p>
    </div>
  );
}

export default PlanBilling;
