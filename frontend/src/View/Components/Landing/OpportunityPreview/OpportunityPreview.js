import './OpportunityPreview.css';

// Illustrative opportunity card for the hero: shows that every idea comes with
// the reasons it fits the user's approach and the risks to weigh.
const REASONS = [
  'Matches your strategies and 30–45 day holding window',
  'Strike sits ~5% below price, under recent support',
  'Elevated IV rank — premiums richer than usual',
  'No earnings before expiry',
];

function OpportunityPreview() {
  return (
    <figure className="opp-preview" aria-label="Example opportunity">
      <span className="opp-preview__tag">Example</span>
      <div className="opp-preview__head">
        <div>
          <p className="opp-preview__title">AAPL · Cash-Secured Put</p>
          <p className="opp-preview__sub">Sell 1 × $320 Put · 35 days</p>
        </div>
        <span className="opp-preview__fit">Fits “Conservative Income”</span>
      </div>

      <dl className="opp-preview__metrics">
        <div>
          <dt>Premium</dt>
          <dd>$410</dd>
        </div>
        <div>
          <dt>Annualised yield</dt>
          <dd>13.4%</dd>
        </div>
        <div>
          <dt>Prob. of profit</dt>
          <dd>78%</dd>
        </div>
        <div>
          <dt>Breakeven</dt>
          <dd>$315.90</dd>
        </div>
      </dl>

      <div className="opp-preview__why">
        <p className="opp-preview__label">Why it was identified</p>
        <ul>
          {REASONS.map((r) => (
            <li key={r}>
              <span aria-hidden="true">✓</span>
              {r}
            </li>
          ))}
        </ul>
      </div>

      <p className="opp-preview__risk">
        <span aria-hidden="true">!</span>
        Risk to weigh: tech-sector volatility is above its 3-month average.
      </p>
    </figure>
  );
}

export default OpportunityPreview;
