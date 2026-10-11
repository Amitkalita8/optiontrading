import { campaignsLabel, holdingLabel } from '../../../../Model/Approaches/approachModel';
import './ApproachOption.css';

// Selectable approach (Existing approach mode): a real radio inside a label,
// so the whole card is clickable and arrow keys move between options.
function ApproachOption({ approach, name, checked, onChange }) {
  return (
    <label className={`approach-option ${checked ? 'approach-option--checked' : ''}`}>
      <input
        type="radio"
        name={name}
        value={approach.id}
        checked={checked}
        onChange={() => onChange(approach.id)}
        className="approach-option__radio"
      />
      <span className="approach-option__body">
        <span className="approach-option__title">
          <span className="approach-option__name">{approach.name}</span>
          {approach.usedInCampaigns > 0 && (
            <span className="approach-option__badge">Active in {campaignsLabel(approach.usedInCampaigns).toLowerCase()}</span>
          )}
        </span>
        <span className="approach-option__summary">
          {approach.strategies.join(' • ')}
          <span className="approach-option__sep" aria-hidden="true">
            |
          </span>
          <b>{holdingLabel(approach.holdingPeriod).replace(' days', ' day')} holding</b>
        </span>
      </span>
      <span className="approach-option__status" aria-hidden="true">
        {checked ? '✓ Selected' : 'Select'}
      </span>
    </label>
  );
}

export default ApproachOption;
