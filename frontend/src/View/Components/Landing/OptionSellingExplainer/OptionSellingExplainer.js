import { optionSelling } from '../../../../Data/landingContent';
import PayoffDiagram from './PayoffDiagram';
import './OptionSellingExplainer.css';

// "What is option selling?" — definition, the short-call example and its payoff.
function OptionSellingExplainer() {
  const { example } = optionSelling;
  return (
    <section id="option-selling" className="landing-section landing-section--white">
      <div className="landing-container explainer">
        <div className="explainer__copy">
          <p className="landing-eyebrow">The basics</p>
          <h2 className="landing-h2">{optionSelling.title}</h2>
          <p className="landing-lead">{optionSelling.intro}</p>

          <div className="explainer__challenges">
            <p>Every option seller has to decide:</p>
            <ul>
              {optionSelling.challenges.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
        </div>

        <figure className="explainer__example">
          <figcaption>
            <span className="explainer__badge">Example</span>
            {example.story}
          </figcaption>
          <PayoffDiagram stock={example.stock} strike={example.strike} premium={example.premium} currency={example.currency} />
          <p className="explainer__assumption">
            Assumes a premium of {example.currency}
            {example.premium} per share; illustrative only.
          </p>
          <div className="explainer__outcomes">
            {example.outcomes.map((o) => (
              <div key={o.title} className={`explainer__outcome explainer__outcome--${o.tone}`}>
                <b>{o.title}</b>
                <span>{o.text}</span>
              </div>
            ))}
          </div>
        </figure>
      </div>
    </section>
  );
}

export default OptionSellingExplainer;
