import { getCompany } from '../../../../Model/Companies/companyModel';
import useLiveQuotes from '../../../../Controller/useLiveQuotes';
import Card from '../../Common/Card/Card';
import CompanySearch from '../CompanySearch/CompanySearch';
import CompanyListItem from '../CompanyListItem/CompanyListItem';
import './CompanyPicker.css';

// "Add Companies" card: search to add, list with remove. Controlled via `tickers`.
function CompanyPicker({ tickers, onChange }) {
  const { quotes } = useLiveQuotes(tickers);
  const add = (ticker) => onChange([...tickers, ticker]);
  const remove = (ticker) => onChange(tickers.filter((t) => t !== ticker));

  return (
    <Card className="company-picker">
      <span className="company-picker__label" id="company-picker-label">
        Add Companies
      </span>
      <CompanySearch exclude={tickers} onPick={add} />

      {tickers.length === 0 ? (
        <p className="company-picker__empty">Search above to add companies to this watchlist.</p>
      ) : (
        <ul className="company-picker__list" aria-labelledby="company-picker-label">
          {tickers.map(getCompany).filter(Boolean).map((c) => (
            <CompanyListItem key={c.ticker} company={c} quote={quotes[c.ticker]} onRemove={remove} />
          ))}
        </ul>
      )}
    </Card>
  );
}

export default CompanyPicker;
