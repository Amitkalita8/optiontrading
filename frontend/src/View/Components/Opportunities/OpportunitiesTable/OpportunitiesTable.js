import { useState } from 'react';
import useLiveQuotes from '../../../../Controller/useLiveQuotes';
import Card from '../../Common/Card/Card';
import Pagination from '../../Common/Pagination/Pagination';
import KebabButton from '../../Common/KebabButton/KebabButton';
import OpportunityRow from './OpportunityRow';
import './OpportunitiesTable.css';

const PAGE_SIZE = 10;
const COLUMNS = [
  'Symbol',
  'Strategy',
  'Current Price',
  'Strike Price',
  'Expiry',
  'Premium',
  'Annualized Yield',
  'Action',
];

function OpportunitiesTable({ opportunities }) {
  const [page, setPage] = useState(1);
  const total = opportunities.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  // Live current price for the visible rows (strike, premium etc. are still sample data).
  const { quotes } = useLiveQuotes(opportunities.slice(start, start + PAGE_SIZE).map((o) => o.symbol));
  const rows = opportunities.slice(start, start + PAGE_SIZE).map((o) => {
    const live = quotes[o.symbol];
    return live ? { ...o, currentPrice: live.price } : o;
  });

  return (
    <Card className="opps-table">
      <div className="opps-table__header">
        <div>
          <h1 className="card__title">New Opportunities</h1>
          <p className="opps-table__subtitle">
            AI found {total} new opportunities based on your campaign goals and watchlist.
          </p>
        </div>
        <KebabButton label="More options" variant="accent" size="lg" />
      </div>

      <div className="opps-table__scroll">
        <table>
          <thead>
            <tr>
              {COLUMNS.map((col) => (
                <th key={col}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <OpportunityRow key={o.id} opportunity={o} />
            ))}
          </tbody>
        </table>
      </div>

      <div className="opps-table__footer">
        <span>
          Showing {total ? start + 1 : 0}–{start + rows.length} of {total} opportunities
        </span>
        {totalPages > 1 && <Pagination page={page} totalPages={totalPages} onChange={setPage} />}
      </div>
    </Card>
  );
}

export default OpportunitiesTable;
