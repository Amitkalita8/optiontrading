import { useCallback } from 'react';
import useAsyncData from '../../../../Controller/useAsyncData';
import { useMarketStatus } from '../../../../Controller/MarketStatusContext';
import { useLocale } from '../../../../Controller/LocaleContext';
import { fetchQuote } from '../../../../Model/MarketData/quoteModel';
import Skeleton from '../../../Components/Common/Skeleton/Skeleton';
import '../SettingsSection.css';
import './MarketDataSettings.css';

// Probe symbol for underlying (stock/ETF) quotes.
const PROBE = 'SPY';

async function probeUnderlying() {
  try {
    const q = await fetchQuote(PROBE);
    return { ok: true, marketTime: q.marketTime };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

function StatusRow({ label, description, pill, tone, freshness, detail }) {
  return (
    <div className="settings-row settings-row--stack">
      <div className="settings-row__text">
        <p className="settings-row__label">{label}</p>
        <p className="settings-row__desc">{description}</p>
      </div>
      <div className="settings-row__control">
        <span className="market-data__status">
          <span className={`settings-pill market-data__pill market-data__pill--${tone}`}>{pill}</span>
          <span className="market-data__freshness">{freshness}</span>
        </span>
        <span className="market-data__detail">{detail}</span>
      </div>
    </div>
  );
}

// Settings › Market Data: live check of the quote feeds the workspace uses.
function MarketDataSettings() {
  const fetcher = useCallback(probeUnderlying, []);
  const { data, status, reload } = useAsyncData(fetcher);
  const isOpen = Boolean(useMarketStatus()?.status?.isOpen);
  const { t, formatDateTime } = useLocale();

  return (
    <div className="settings-tab">
      <header>
        <h1 className="settings-tab__title">{t('settings.marketData')}</h1>
        <p className="settings-tab__subtitle">{t('marketData.subtitle')}</p>
      </header>

      <section className="settings-card" aria-labelledby="market-data-status">
        <div className="market-data__head">
          <h2 id="market-data-status" className="settings-card__title">{t('marketData.statusTitle')}</h2>
          <button type="button" className="market-data__refresh" onClick={reload} disabled={status === 'loading'}>
            {t(status === 'loading' ? 'marketData.checking' : 'marketData.checkAgain')}
          </button>
        </div>
        <p className="settings-card__lead">{t('marketData.statusLead')}</p>

        {status === 'loading' && !data ? (
          <div className="settings-row" aria-busy="true">
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Skeleton width={220} height={20} />
              <Skeleton width="55%" height={14} />
            </div>
            <Skeleton width={190} height={30} radius={6} />
          </div>
        ) : (
          <StatusRow
            label={t('marketData.underlying')}
            description={t('marketData.underlyingDesc')}
            pill={t(data?.ok ? 'marketData.available' : 'marketData.unavailable')}
            tone={data?.ok ? 'ok' : 'down'}
            freshness={t(data?.ok ? (isOpen ? 'marketData.realtime' : 'marketData.marketClosed') : 'marketData.noFeed')}
            detail={
              data?.ok
                ? t('marketData.lastUpdate', { time: formatDateTime(data.marketTime, { zone: true }) })
                : t('marketData.noResponse')
            }
          />
        )}

        <StatusRow
          label={t('marketData.options')}
          description={t('marketData.optionsDesc')}
          pill={t('marketData.sample')}
          tone="sample"
          freshness={t('marketData.illustrative')}
          detail={t('marketData.optionsDetail')}
        />
      </section>
    </div>
  );
}

export default MarketDataSettings;
