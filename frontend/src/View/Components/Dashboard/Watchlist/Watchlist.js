import { Link } from 'react-router-dom';
import useMediaQuery, { BREAKPOINTS } from '../../../../Controller/useMediaQuery';
import Card from '../../Common/Card/Card';
import SectionHeader from '../../Common/SectionHeader/SectionHeader';
import TickerLogo from '../../Common/TickerLogo/TickerLogo';
import watchlistIcon from '../../../Assets/Image/Light/Vector.png';
import './Watchlist.css';

const VISIBLE = 6;

function Watchlist({ items }) {
  const isMobile = useMediaQuery(BREAKPOINTS.mobile);
  const extra = items.length - VISIBLE;

  return (
    <Card className="watchlist">
      <SectionHeader icon={<img src={watchlistIcon} alt="" className="watchlist__icon" />} title="Watchlist" linkLabel="View Watchlist" linkTo="/watchlist" />
      <div className="watchlist__logos">
        {items.slice(0, VISIBLE).map((item) => (
          <Link key={item.ticker} to={`/stocks/${item.ticker}`} className="watchlist__logo-link" aria-label={`${item.ticker} stock details`}>
            <TickerLogo ticker={item.ticker} color={item.color} size={isMobile ? 32 : 40} />
          </Link>
        ))}
        {extra > 0 && <span className="watchlist__more">+{extra}</span>}
      </div>
    </Card>
  );
}

export default Watchlist;
