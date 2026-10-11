import { formatCurrency } from '../../../../Utils/format';

// `label` is shown in front of the value when the table collapses to cards on mobile.
function Cell({ label, primary, secondary, className = '' }) {
  return (
    <td data-label={label} className={className}>
      <div className="campaign-table__primary">{primary}</div>
      {secondary && <div className="campaign-table__secondary">{secondary}</div>}
    </td>
  );
}

function CampaignRow({ campaign: c }) {
  return (
    <tr>
      <Cell
        className="campaign-table__name"
        label="Campaign"
        primary={c.name}
        secondary={`Created on ${c.createdOn}`}
      />
      <Cell label="Capital Allocated" primary={formatCurrency(c.capital)} secondary={`${c.consumed}% consumed`} />
      <Cell label="Goal" primary={formatCurrency(c.goal)} secondary="Monthly target" />
      <Cell label="Progress" primary={`${c.progress}%`} secondary={c.progressNote} />
      <Cell label="Earned So Far" primary={formatCurrency(c.earned)} secondary={c.earnedNote} />
      <td data-label="Status" className="campaign-table__status">
        {c.status}
      </td>
      <td className="campaign-table__actions">
        <button type="button" className="campaign-table__menu" aria-label={`Actions for ${c.name}`}>
          ⋮
        </button>
      </td>
    </tr>
  );
}

export default CampaignRow;
