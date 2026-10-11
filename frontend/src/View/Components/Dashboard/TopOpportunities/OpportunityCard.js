import Button from '../../Common/Button/Button';

function OpportunityCard({ opportunity }) {
  return (
    <article className="opp-card">
      <div className="opp-card__head">
        <div>
          <h3 className="opp-card__title">{opportunity.title}</h3>
          <div className="opp-card__tags">
            {opportunity.tags.map((tag) => (
              <span key={tag.label} className={`opp-card__tag opp-card__tag--${tag.tone}`}>
                {tag.label}
              </span>
            ))}
          </div>
        </div>
        <span className="opp-card__risk">{opportunity.risk}</span>
      </div>

      <dl className="opp-card__metrics">
        {opportunity.metrics.map((m) => (
          <div key={m.label} className="opp-card__metric">
            <dt>{m.label}</dt>
            <dd>{m.value}</dd>
            {m.note && <dd className="opp-card__note">{m.note}</dd>}
          </div>
        ))}
      </dl>

      <Button className="opp-card__cta" iconRight="→">
        View Details
      </Button>
    </article>
  );
}

export default OpportunityCard;
