import { Link } from 'react-router-dom';
import { formatPrice } from '../../../../Utils/format';
import { ChevronIcon } from '../../Icons/FallbackIcons';
import SymbolBadge from '../../Common/SymbolBadge/SymbolBadge';
import KebabButton from '../../Common/KebabButton/KebabButton';
import GoalFitBadge from '../GoalFitBadge/GoalFitBadge';
import MarketChange from '../MarketChange/MarketChange';

// `data-label` is shown in front of each value when the table collapses to cards on phones.
function WatchlistRow({ company: c }) {
  return (
    <tr>
      <td className="wl-table__symbol">
        <Link to={`/stocks/${c.ticker}`} className="wl-table__symbol-inner">
          <SymbolBadge symbol={c.ticker} abbr={c.abbr} tone={c.tone} />
          <span>{c.ticker}</span>
        </Link>
      </td>
      <td data-label="Current Price">{formatPrice(c.price)}</td>
      <td data-label="Market Change">
        <MarketChange value={c.change} />
      </td>
      <td data-label="Goal Fit">
        <GoalFitBadge fit={c.goalFit} />
      </td>
      <td data-label="Latest Signal" className="wl-table__signal">
        {c.opportunityId ? (
          <Link to={`/opportunities/${c.opportunityId}`} aria-label={`View ${c.ticker} opportunity`}>
            View opportunity
            <ChevronIcon direction="right" size={16} />
          </Link>
        ) : (
          <span className="wl-table__monitoring">Monitoring</span>
        )}
      </td>
      <td className="wl-table__actions">
        <KebabButton label={`${c.ticker} actions`} />
      </td>
    </tr>
  );
}

export default WatchlistRow;
