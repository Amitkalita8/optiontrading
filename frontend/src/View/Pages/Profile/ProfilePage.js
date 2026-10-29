import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../Components/UserAuthentication/AuthContext/AuthContext';
import { useLocale } from '../../../Controller/LocaleContext';
import ProfileSettings from './ProfileSettings/ProfileSettings';
import AppearanceSettings from './Appearance/AppearanceSettings';
import PlanBilling from './PlanBilling/PlanBilling';
import HelpLegal from './HelpLegal/HelpLegal';
import NotificationSettings from './NotificationSettings/NotificationSettings';
import MarketDataSettings from './MarketData/MarketDataSettings';
import SecuritySettings from './Security/SecuritySettings';
import './ProfilePage.css';

// Demo broker accounts. lastSynced is an ISO time (shown in the user's
// date format / time zone); access text comes from the translations.
const DEMO_SYNC = new Date(new Date().setHours(10, 42, 0, 0)).toISOString();
const INITIAL_CONNECTED_BROKERS = [
  {
    id: 'schwab',
    name: 'Charles Schwab',
    mask: '4821',
    lastSynced: DEMO_SYNC,
    linkedToCampaign: true,
    isDefault: true,
  },
  {
    id: 'ibkr',
    name: 'Interactive Brokers',
    mask: '9081',
    lastSynced: DEMO_SYNC,
    linkedToCampaign: false,
    isDefault: false,
  },
  {
    id: 'robinhood',
    name: 'Robinhood',
    mask: '0145',
    lastSynced: DEMO_SYNC,
    linkedToCampaign: false,
    isDefault: false,
  },
];

const BROKERS_STORAGE_KEY = 'kushmanda.brokerAccounts';

export default function ProfilePage() {
  const { user } = useAuth();
  const { t, formatDateTime } = useLocale();
  // Older saved data stored display text; show it as-is.
  const syncedAt = (v) => (Number.isNaN(Date.parse(v)) ? v : formatDateTime(v));
  const location = useLocation();

  // Active section from current path
  const currentPath = location.pathname.toLowerCase();
  const activeSection = currentPath.includes('/broker-accounts')
    ? 'broker-accounts'
    : currentPath.includes('/notifications')
    ? 'notifications'
    : currentPath.includes('/market-data')
    ? 'market-data'
    : currentPath.includes('/security')
    ? 'security'
    : currentPath.includes('/appearance')
    ? 'appearance'
    : currentPath.includes('/billing')
    ? 'billing'
    : currentPath.includes('/legal')
    ? 'legal'
    : 'profile';

  // Broker Accounts State
  const [brokers, setBrokers] = useState(() => {
    try {
      const saved = localStorage.getItem(BROKERS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_CONNECTED_BROKERS;
  });

  const [toastMessage, setToastMessage] = useState(null);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Broker Handlers
  const handleReconnect = (brokerName) => {
    setBrokers((prev) =>
      prev.map((b) => (b.name === brokerName ? { ...b, lastSynced: new Date().toISOString() } : b))
    );
    showToast(t('broker.reconnected', { name: brokerName }));
  };

  const handleSetDefaultBroker = (brokerId) => {
    setBrokers((prev) =>
      prev.map((b) => ({ ...b, isDefault: b.id === brokerId }))
    );
    setActiveMenuId(null);
    showToast(t('broker.defaultUpdated'));
  };

  const handleAddBroker = (name, mask) => {
    const newBroker = {
      id: name.toLowerCase().replace(/\s+/g, '-'),
      name,
      mask,
      lastSynced: new Date().toISOString(),
        linkedToCampaign: false,
      isDefault: false,
    };
    const updated = [...brokers, newBroker];
    setBrokers(updated);
    try {
      localStorage.setItem(BROKERS_STORAGE_KEY, JSON.stringify(updated));
    } catch {}
    setShowConnectModal(false);
    showToast(t('broker.connected', { name }));
  };

  // Default broker
  const defaultBroker = brokers.find((b) => b.isDefault) || brokers[0];

  // Helper to render Broker Logo matching Screenshot 1
  const renderBrokerLogo = (id) => {
    if (id === 'schwab') {
      return (
        <div className="broker-logo broker-logo--schwab" title="Charles Schwab">
          <svg width="34" height="26" viewBox="0 0 120 70" fill="none">
            <text
              x="8"
              y="45"
              fill="#ffffff"
              fontFamily="Georgia, serif"
              fontSize="28"
              fontStyle="italic"
              fontWeight="bold"
            >
              schwab
            </text>
          </svg>
        </div>
      );
    }
    if (id === 'ibkr') {
      return (
        <div className="broker-logo broker-logo--ibkr" title="Interactive Brokers">
          <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
            <path d="M6 6h10l-4 20H6V6z" fill="#dc2626" />
            <circle cx="23" cy="16" r="3" fill="#111827" />
          </svg>
        </div>
      );
    }
    if (id === 'robinhood') {
      return (
        <div className="broker-logo broker-logo--robinhood" title="Robinhood">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z" />
            <line x1="16" y1="8" x2="2" y2="22" />
            <line x1="17.5" y1="15" x2="9" y2="15" />
          </svg>
        </div>
      );
    }
    return (
      <div className="broker-logo" style={{ background: '#f1f5f9', color: '#173d2c' }}>
        🏛️
      </div>
    );
  };

  return (
    <div className="settings-page-wrapper">
      {/* Toast */}
      {toastMessage && (
        <div className="settings-toast" role="status">
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ===================================================================
          SCREEN 1: BROKER ACCOUNTS VIEW (Matches Screenshot 1)
          =================================================================== */}
      {activeSection === 'broker-accounts' && (
        <div className="broker-accounts-view">
          {/* Top Header */}
          <div className="settings-header-row">
            <div className="settings-header-col">
              <h1 className="settings-page-title">{t('settings.brokers')}</h1>
              <p className="settings-page-subtitle">{t('broker.subtitle')}</p>
            </div>
            <button
              type="button"
              className="btn-primary-dark"
              onClick={() => setShowConnectModal(true)}
            >
              <span style={{ fontSize: '16px', lineHeight: 1 }}>+</span>
              <span>{t('broker.connect')}</span>
            </button>
          </div>

          {/* Section 1: Default trading account */}
          <div className="settings-section-heading">
            <h2 className="settings-section-title">{t('broker.defaultTitle')}</h2>
            <p className="settings-section-subtitle">{t('broker.defaultLead')}</p>
          </div>

          <div className="broker-card">
            <div className="broker-row-main">
              <div className="broker-info-group">
                {renderBrokerLogo(defaultBroker.id)}
                <div className="broker-details">
                  <div className="broker-name-line">
                    <span>{defaultBroker.name}</span>
                    <span>·</span>
                    <span>• • • • {defaultBroker.mask}</span>
                  </div>
                  <div className="broker-sync-line">
                    {t('broker.lastSynced', { time: syncedAt(defaultBroker.lastSynced) })}
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="btn-reconnect"
                onClick={() => handleReconnect(defaultBroker.name)}
              >
                {t('broker.reconnect')}
              </button>
            </div>

            {/* Alert Notice Box beneath Default Account */}
            <div className="broker-info-notice">
              <div className="broker-info-notice-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
              </div>
              <div>
                {t('broker.defaultNotice')}
              </div>
            </div>
          </div>

          {/* Section 2: Connected accounts */}
          <div className="settings-section-heading">
            <h2 className="settings-section-title">{t('broker.connectedTitle')}</h2>
            <p className="settings-section-subtitle">{t('broker.connectedLead')}</p>
          </div>

          <div className="broker-connected-list">
            {brokers.map((broker) => (
              <div key={broker.id} className="broker-card">
                <div className="broker-row-main">
                  <div className="broker-info-group">
                    {renderBrokerLogo(broker.id)}
                    <div className="broker-details">
                      <div className="broker-name-line">
                        <span>{broker.name}</span>
                        <span>·</span>
                        <span>• • • • {broker.mask}</span>
                      </div>
                      <div className="broker-sync-line">
                        {t('broker.lastSynced', { time: syncedAt(broker.lastSynced) })}
                      </div>
                    </div>
                  </div>

                  <div className="broker-actions-right" style={{ position: 'relative' }}>
                    <button
                      type="button"
                      className="btn-more-dots"
                      title={t('broker.moreOptions')}
                      aria-label={t('broker.moreOptions')}
                      onClick={() =>
                        setActiveMenuId(activeMenuId === broker.id ? null : broker.id)
                      }
                    >
                      •••
                    </button>

                    {activeMenuId === broker.id && (
                      <div className="broker-menu" role="menu">
                        {!broker.isDefault && (
                          <button
                          type="button"
                          role="menuitem"
                          className="broker-menu__item"
                            onClick={() => handleSetDefaultBroker(broker.id)}
                          >
                            {t('broker.setDefault')}
                          </button>
                        )}
                        <button
                          type="button"
                          role="menuitem"
                          className="broker-menu__item"
                          onClick={() => {
                            handleReconnect(broker.name);
                            setActiveMenuId(null);
                          }}
                        >
                          {t('broker.reconnect')}
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          className="broker-menu__item broker-menu__item--danger"
                          onClick={() => {
                            setBrokers(brokers.filter((b) => b.id !== broker.id));
                            setActiveMenuId(null);
                            showToast(t('broker.disconnected', { name: broker.name }));
                          }}
                        >
                          {t('broker.disconnect')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="broker-permissions-line">
                  {t('broker.grantedAccess', { access: t('broker.accessFull') })}
                </div>

                {broker.linkedToCampaign && (
                  <div className="broker-campaign-note">
                    {t('broker.campaignNote')}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Connect Broker Modal */}
          {showConnectModal && (
            <div
              className="broker-modal-overlay"
              onClick={() => setShowConnectModal(false)}
            >
              <div
                className="broker-modal-card"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="broker-modal-header">
                  <h3 className="broker-modal-title">{t('broker.connect')}</h3>
                  <button
                    type="button"
                    className="broker-modal-close"
                    aria-label={t('common.close')}
                    onClick={() => setShowConnectModal(false)}
                  >
                    ×
                  </button>
                </div>
                <p className="broker-modal-lead">{t('broker.modalLead')}</p>

                <div className="broker-list-select">
                  {[
                    { name: 'Charles Schwab', mask: '7721' },
                    { name: 'Interactive Brokers', mask: '5541' },
                    { name: 'Robinhood', mask: '3310' },
                    { name: 'Fidelity Investments', mask: '8820' },
                    { name: 'E*TRADE from Morgan Stanley', mask: '6190' },
                    { name: 'Webull Financial', mask: '4019' },
                  ].map((b) => (
                    <div
                      key={b.name}
                      className="broker-option-item"
                      onClick={() => handleAddBroker(b.name, b.mask)}
                    >
                      <span style={{ fontWeight: 600, fontSize: '13.5px' }}>
                        {b.name}
                      </span>
                      <span className="broker-option-connect">{t('broker.connectArrow')}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================
          SCREEN 2: PROFILE VIEW (Matches Screenshot 2)
          =================================================================== */}
      {activeSection === 'profile' && <ProfileSettings key={user?.email ?? 'guest'} onNotice={showToast} />}
      {activeSection === 'appearance' && <AppearanceSettings onSaved={showToast} />}
      {activeSection === 'billing' && <PlanBilling onNotice={showToast} />}
      {activeSection === 'legal' && <HelpLegal onNotice={showToast} />}
      {activeSection === 'notifications' && <NotificationSettings onNotice={showToast} />}
      {activeSection === 'market-data' && <MarketDataSettings />}
      {activeSection === 'security' && <SecuritySettings onNotice={showToast} />}
    </div>
  );
}
