import { money, SAMPLE_QUOTES } from '../../../../Data/appearanceSamples';
import { useLocale } from '../../../../Controller/LocaleContext';
import './QuotesPreview.css';

// A miniature workspace (sidebar + quotes table) rendered in a given theme
// and density. `data-theme` re-scopes the colour tokens to this box only, so
// it can preview a theme without changing the rest of the app.
//   size: 'mini' (theme cards) | 'full' (the Preview section)
function QuotesPreview({ theme, density = 'comfortable', size = 'full', rows = 3 }) {
  const { t, formatDate } = useLocale();
  const full = size === 'full';
  const quotes = SAMPLE_QUOTES.slice(0, rows);

  return (
    <div
      className={`quotes-preview quotes-preview--${size} quotes-preview--${density}`}
      data-theme={theme}
      aria-hidden={!full}
    >
      <div className="quotes-preview__side">
        <span className="quotes-preview__brand">{t('quotes.workspace')}</span>
        <span className="quotes-preview__nav quotes-preview__nav--active">{t('quotes.quotes')}</span>
        <span className="quotes-preview__nav">{t('quotes.watchlist')}</span>
      </div>
      <div className="quotes-preview__main">
        <div className="quotes-preview__head">
          <span className="quotes-preview__title">{t('quotes.usOptions')}</span>
          <span className="quotes-preview__note">{t('quotes.sample')}</span>
        </div>
        <table className="quotes-preview__table">
          <thead>
            <tr>
              <th>{t('quotes.symbol')}</th>
              <th>{t('quotes.contract')}</th>
              {full && <th>{t('quotes.expiration')}</th>}
              <th>{t('quotes.bid')}</th>
              <th>{t('quotes.ask')}</th>
              {full && <th>{t('quotes.spread')}</th>}
            </tr>
          </thead>
          <tbody>
            {quotes.map((q) => (
              <tr key={`${q.symbol}-${q.contract}`}>
                <td className="quotes-preview__symbol">{q.symbol}</td>
                <td>{q.contract}</td>
                {full && <td className="quotes-preview__muted">{formatDate(q.expiration)}</td>}
                <td>{money(q.bid)}</td>
                <td>{money(q.ask)}</td>
                {full && <td className="quotes-preview__spread">{money(q.ask - q.bid)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default QuotesPreview;
