import { principle } from '../../../../Data/landingContent';
import './DecisionSupport.css';

// Positioning: a research and decision-support platform, not a tip service.
function DecisionSupport() {
  return (
    <section id="approach" className="landing-section landing-section--white">
      <div className="landing-container">
        <div className="landing-heading">
          <p className="landing-eyebrow">Our approach</p>
          <h2 className="landing-h2">{principle.title}</h2>
          <p className="landing-lead">{principle.subtitle}</p>
        </div>

        <div className="decision">
          <div className="decision__col decision__col--not">
            <h3>What we don&apos;t do</h3>
            <ul>
              {principle.not.map((item) => (
                <li key={item}>
                  <span aria-hidden="true">✕</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="decision__col decision__col--do">
            <h3>What you get instead</h3>
            <ul>
              {principle.instead.map((item) => (
                <li key={item}>
                  <span aria-hidden="true">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

export default DecisionSupport;
