import { useEffect, useState } from 'react';
import Card from '../../Common/Card/Card';
import Button from '../../Common/Button/Button';
import Pagination from '../../Common/Pagination/Pagination';
import CampaignRow from './CampaignRow';
import './CampaignTable.css';

const COLUMNS = ['Campaign', 'Capital Allocated', 'Goal', 'Progress', 'Earned So Far', 'Status', 'Actions'];
export const PAGE_SIZE = 10;

function CampaignTable({ campaigns, onCreate, onAction, busyId }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(campaigns.length / PAGE_SIZE));

  // Deleting the last row of the last page steps back a page.
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const start = (page - 1) * PAGE_SIZE;
  const visible = campaigns.slice(start, start + PAGE_SIZE);

  return (
    <Card className="campaign-table">
      <div className="campaign-table__header">
        <div>
          <h2 className="card__title">Your Campaigns</h2>
          <p className="campaign-table__subtitle">Manage your trading campaigns and track progress towards your goals.</p>
        </div>
        <Button icon="+" onClick={onCreate}>
          Create New Campaign
        </Button>
      </div>

      {campaigns.length === 0 ? (
        <p className="campaign-table__empty">No campaigns yet. Create one to set your capital, goal and dates.</p>
      ) : (
        <div className="campaign-table__scroll">
          <table>
            <thead>
              <tr>
                {COLUMNS.map((col) => (
                  <th key={col}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((c) => (
                <CampaignRow key={c.id} campaign={c} onAction={onAction} busy={busyId === c.id} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="campaign-table__footer">
        <span>
          {campaigns.length === 0
            ? 'Showing 0 campaigns'
            : `Showing ${start + 1}–${start + visible.length} of ${campaigns.length} campaign${campaigns.length === 1 ? '' : 's'}`}
        </span>
        {totalPages > 1 && <Pagination page={page} totalPages={totalPages} onChange={setPage} />}
      </div>
    </Card>
  );
}

export default CampaignTable;
