import { useState } from 'react';
import Card from '../../Common/Card/Card';
import SectionHeader from '../../Common/SectionHeader/SectionHeader';
import OpportunityCard from './OpportunityCard';
import opportunitiesIcon from '../../../Assets/Image/Dark/fluent_task-list-square-sparkle-20-filled.png';
import './TopOpportunities.css';

function TopOpportunities({ tabs, opportunities }) {
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const [index, setIndex] = useState(0);
  const items = opportunities[activeTab] ?? [];
  const current = items[index];

  const selectTab = (tab) => {
    setActiveTab(tab);
    setIndex(0);
  };

  return (
    <Card className="top-opps">
      <SectionHeader
        boxedIcon
        icon={<img src={opportunitiesIcon} alt="" className="top-opps__icon" />}
        title="Top Opportunities"
        subtitle="Based on your rules, market conditions and historical data."
        linkLabel="View all"
        linkTo="/opportunities"
      />

      <div className="top-opps__tabs" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={tab === activeTab}
            className={`top-opps__tab ${tab === activeTab ? 'top-opps__tab--active' : ''}`}
            onClick={() => selectTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {current ? (
        <OpportunityCard opportunity={current} />
      ) : (
        <div className="top-opps__empty">No opportunities match this filter right now.</div>
      )}

      {items.length > 1 && (
        <div className="top-opps__dots">
          {items.map((item, i) => (
            <button
              key={item.id}
              type="button"
              className={`top-opps__dot ${i === index ? 'top-opps__dot--active' : ''}`}
              onClick={() => setIndex(i)}
              aria-label={`Show opportunity ${i + 1}`}
            />
          ))}
        </div>
      )}
    </Card>
  );
}

export default TopOpportunities;
