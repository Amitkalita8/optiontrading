import { workflow } from '../../../../Data/landingContent';
import './WorkflowSteps.css';

// The overall flow (Create Campaign → … → Trade Log) in three phases,
// numbered continuously across phases.
function WorkflowSteps() {
  let n = 0;
  return (
    <section id="how-it-works" className="landing-section">
      <div className="landing-container">
        <div className="landing-heading">
          <p className="landing-eyebrow">How it works</p>
          <h2 className="landing-h2">A structured workflow, from plan to position</h2>
          <p className="landing-lead">
            Each step builds on the one before — so what you see is always shaped by the plan you set.
          </p>
        </div>

        <ol className="workflow">
          {workflow.map((phase, i) => (
            <li key={phase.phase} className="workflow__phase">
              <div className="workflow__phase-head">
                <span className="workflow__phase-index">0{i + 1}</span>
                <div>
                  <h3>{phase.phase}</h3>
                  <p>{phase.summary}</p>
                </div>
              </div>

              {phase.formula && (
                <p className="workflow__formula" aria-label="AI Screener equals your approach plus your watchlist">
                  <span>{phase.formula[0]}</span>+<span>{phase.formula[1]}</span>=<b>{phase.formula[2]}</b>
                </p>
              )}

              <ol className="workflow__steps">
                {phase.steps.map((step) => {
                  n += 1;
                  return (
                    <li key={step.title}>
                      <span className="workflow__num">{n}</span>
                      <div>
                        <b>{step.title}</b>
                        <p>{step.text}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export default WorkflowSteps;
