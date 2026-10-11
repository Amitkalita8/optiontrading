import {
  campaignsLabel,
  holdingLabel,
  profitLabel,
  stopLossLabel,
  yieldLabel,
} from '../../../../Model/Approaches/approachModel';
import ActionMenu from '../../Common/ActionMenu/ActionMenu';

// `data-label` is shown in front of each value when the table collapses to cards on phones.
function ApproachRow({ approach: a, onEdit, onDelete }) {
  const inUse = a.usedInCampaigns > 0;
  return (
    <tr>
      <td className="approach-table__name">{a.name}</td>
      <td data-label="Strategies">{a.strategies.join(', ')}</td>
      <td data-label="Discovery">
        <div className="approach-table__primary">{holdingLabel(a.holdingPeriod)}</div>
        <div className="approach-table__secondary">
          {a.moneyness} • {yieldLabel(a.minYield)}
        </div>
      </td>
      <td data-label="Position Management">
        <div className="approach-table__primary">{profitLabel(a)}</div>
        <div className="approach-table__secondary">{stopLossLabel(a)}</div>
      </td>
      <td data-label="Used In">{campaignsLabel(a.usedInCampaigns)}</td>
      <td className="approach-table__actions">
        <ActionMenu
          label={`${a.name} actions`}
          items={[
            { label: 'Edit approach', onSelect: () => onEdit(a) },
            {
              label: 'Delete',
              danger: true,
              disabled: inUse,
              hint: inUse ? `Used by ${campaignsLabel(a.usedInCampaigns).toLowerCase()}` : undefined,
              onSelect: () => onDelete(a),
            },
          ]}
        />
      </td>
    </tr>
  );
}

export default ApproachRow;
