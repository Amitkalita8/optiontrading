import { campaignInputs } from '../../../../Data/landingContent';
import './CampaignInputs.css';

// The campaign preferences that shape every screen and opportunity.
function CampaignInputs() {
  return (
    <section className="landing-section">
      <div className="landing-container inputs">
        <div className="inputs__copy">
          <p className="landing-eyebrow">Your campaign</p>
          <h2 className="landing-h2">Your preferences drive everything</h2>
          <p className="landing-lead">
            A campaign captures how you want to trade. The AI screener, opportunities and position alerts all work from
            these inputs — so results fit your plan, not a generic one.
          </p>
        </div>

        <ul className="inputs__grid">
          {campaignInputs.map((input) => (
            <li key={input.label}>
              <b>{input.label}</b>
              <span>{input.hint}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default CampaignInputs;
