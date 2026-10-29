import { money, SAMPLE_QUOTES } from '../../../../Data/appearanceSamples';
import { useT } from '../../../../Controller/LocaleContext';
import './DensitySample.css';

// Small quotes table shown inside a density card.
function DensitySample({ density, rows }) {
  const t = useT();
  return (
    <table className={`density-sample density-sample--${density}`} aria-hidden="true">
      <thead>
        <tr>
          <th>{t('quotes.symbol')}</th>
          <th>{t('quotes.contract')}</th>
          <th>{t('quotes.bid')}</th>
          <th>{t('quotes.ask')}</th>
        </tr>
      </thead>
      <tbody>
        {SAMPLE_QUOTES.slice(0, rows).map((q) => (
          <tr key={`${q.symbol}-${q.contract}`}>
            <td>{q.symbol}</td>
            <td>{q.contract}</td>
            <td>{money(q.bid)}</td>
            <td>{money(q.ask)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default DensitySample;
