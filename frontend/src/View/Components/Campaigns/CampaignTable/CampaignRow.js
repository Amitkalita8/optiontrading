import { formatCurrency } from '../../../../Utils/format';
import ActionMenu from '../../Common/ActionMenu/ActionMenu';

const icon = (d) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {d}
  </svg>
);
const ICONS = {
  edit: icon(<path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17zM14 7l3 3" />),
  watchlist: icon(<path d="M4 7h10M4 12h16M4 17h7M17 4v6M14 7h6" />),
  pause: icon(<path d="M9 5v14M15 5v14" />),
  resume: icon(<path d="M7 5v14l11-7z" />),
  complete: icon(<path d="m5 12.5 4.5 4.5L19 7.5" />),
  duplicate: icon(
    <>
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </>,
  ),
  delete: icon(<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />),
};

// `label` is shown in front of the value when the table collapses to cards on mobile.
function Cell({ label, primary, secondary, className = '' }) {
  return (
    <td data-label={label} className={className}>
      <div className="campaign-table__primary">{primary}</div>
      {secondary && <div className="campaign-table__secondary">{secondary}</div>}
    </td>
  );
}

function CampaignRow({ campaign: c, onAction, busy }) {
  const paused = c.health === 'paused';
  const done = c.health === 'completed';
  const items = [
    { label: 'Edit campaign', icon: ICONS.edit, onSelect: () => onAction('edit', c) },
    { label: 'Manage watchlist', icon: ICONS.watchlist, onSelect: () => onAction('watchlist', c) },
    paused
      ? { label: 'Resume campaign', icon: ICONS.resume, onSelect: () => onAction('resume', c) }
      : { label: 'Pause campaign', icon: ICONS.pause, onSelect: () => onAction('pause', c), disabled: done, hint: done ? 'Completed campaigns can’t be paused' : undefined },
    ...(done ? [] : [{ label: 'Mark as completed', icon: ICONS.complete, onSelect: () => onAction('complete', c) }]),
    { label: 'Duplicate campaign', icon: ICONS.duplicate, onSelect: () => onAction('duplicate', c) },
    { label: 'Delete campaign', icon: ICONS.delete, danger: true, onSelect: () => onAction('delete', c) },
  ];

  return (
    <tr className={busy ? 'campaign-table__row--busy' : ''}>
      <Cell className="campaign-table__name" label="Campaign" primary={c.name} secondary={c.createdOn && `Created on ${c.createdOn}`} />
      <Cell label="Capital Allocated" primary={formatCurrency(c.capital)} secondary={c.capitalNote} />
      <Cell label="Goal" primary={formatCurrency(c.goal)} secondary={c.goalNote} />
      <Cell label="Progress" primary={`${c.progress}%`} secondary={c.progressNote} />
      <Cell label="Earned So Far" primary={formatCurrency(c.earned)} secondary={c.earnedNote} />
      <td data-label="Status" className="campaign-table__status">
        <span className={`campaign-table__badge campaign-table__badge--${c.health}`}>{c.statusLabel}</span>
      </td>
      <td className="campaign-table__actions">
        <ActionMenu label={`Actions for ${c.name}`} items={items} />
      </td>
    </tr>
  );
}

export default CampaignRow;
