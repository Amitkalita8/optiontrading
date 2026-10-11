import { useState } from 'react';
import Card from '../../Common/Card/Card';
import Button from '../../Common/Button/Button';
import Pagination from '../../Common/Pagination/Pagination';
import CampaignRow from './CampaignRow';
import './CampaignTable.css';

const COLUMNS = ['Campaign', 'Capital Allocated', 'Goal', 'Progress', 'Earned So Far', 'Status', 'Actions'];

function CampaignTable({ campaigns, onCreate }) {
  const [page, setPage] = useState(1);

  return (
    <Card className="campaign-table">
      <div className="campaign-table__header">
        <div>
          <h2 className="card__title">Your Campaigns</h2>
          <p className="campaign-table__subtitle">
            Manage your trading campaigns and track progress towards your goals.
          </p>
        </div>
        <Button icon="+" onClick={onCreate}>
          Create New Campaign
        </Button>
      </div>

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
            {campaigns.map((c) => (
              <CampaignRow key={c.id} campaign={c} />
            ))}
          </tbody>
        </table>
      </div>

      <div className="campaign-table__footer">
        <span>Showing 1–{campaigns.length} of {campaigns.length} campaigns</span>
        <Pagination page={page} totalPages={3} onChange={setPage} />
      </div>
    </Card>
  );
}

export default CampaignTable;
