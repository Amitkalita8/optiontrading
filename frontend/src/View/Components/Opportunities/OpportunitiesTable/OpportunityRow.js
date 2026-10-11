import { Link } from 'react-router-dom';
import { formatPrice } from '../../../../Utils/format';
import { ChevronIcon } from '../../Icons/FallbackIcons';
import SymbolBadge from '../../Common/SymbolBadge/SymbolBadge';

// `data-label` is shown in front of each value when the table collapses to cards on phones.
function OpportunityRow({ opportunity: o }) {
  return (
    <tr>
      <td className="opps-table__symbol">
        <Link to={`/stocks/${o.symbol}`} className="opps-table__symbol-inner">
          <SymbolBadge symbol={o.symbol} abbr={o.abbr} tone={o.tone} />
          <span>{o.symbol}</span>
        </Link>
      </td>
      <td className="opps-table__strategy">{o.strategy}</td>
      <td data-label="Current Price">{formatPrice(o.currentPrice)}</td>
      <td data-label="Strike Price">{formatPrice(o.strikePrice)}</td>
      <td data-label="Expiry">{o.expiryDays}d</td>
      <td data-label="Premium">{formatPrice(o.premium)}</td>
      <td data-label="Annualized Yield">{o.annualizedYield.toFixed(1)}%</td>
      <td className="opps-table__action">
        <Link to={`/opportunities/${o.id}`} aria-label={`View ${o.symbol} ${o.strategy} opportunity`}>
          View opportunity
          <ChevronIcon direction="right" size={16} />
        </Link>
      </td>
    </tr>
  );
}

export default OpportunityRow;
