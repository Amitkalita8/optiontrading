import { Link } from 'react-router-dom';
import { systemStatus } from '../../../../Data/mockData';
import Button from '../../Common/Button/Button';
import './FlowPage.css';

// Full-bleed layout for step-by-step screens (create watchlist, add company):
// title band, centred content, Back / Continue actions and a status bar.
function FlowPage({
  title,
  children,
  backTo,
  backLabel = 'Back',
  continueLabel = 'Continue',
  onContinue,
  continueDisabled = false,
  busy = false,
}) {
  return (
    <div className="flow-page">
      <header className="flow-page__band">
        <h1>{title}</h1>
      </header>

      <div className="flow-page__body">
        {children}

        <div className="flow-page__actions">
          <Link to={backTo} className="flow-page__back">
            {backLabel}
          </Link>
          <Button onClick={onContinue} disabled={continueDisabled || busy} iconRight="→">
            {busy ? 'Saving…' : continueLabel}
          </Button>
        </div>
      </div>

      <footer className="flow-page__status">
        <span>
          AI Model: {systemStatus.model} • Latency: {systemStatus.latency}
        </span>
        <span>{systemStatus.feedNote}</span>
      </footer>
    </div>
  );
}

export default FlowPage;
