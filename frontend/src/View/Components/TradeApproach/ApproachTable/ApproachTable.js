import { useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../../Common/Card/Card';
import Pagination from '../../Common/Pagination/Pagination';
import ApproachRow from './ApproachRow';
import '../../Common/Button/Button.css';
import './ApproachTable.css';

const PAGE_SIZE = 10;
const COLUMNS = ['Approach', 'Strategies', 'Discovery', 'Position Management', 'Used In', 'Actions'];

// "Trade Approaches" card: header with Create button, table, pagination.
function ApproachTable({ approaches, onEdit, onDelete, notice }) {
  const [page, setPage] = useState(1);
  const total = approaches.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const start = (current - 1) * PAGE_SIZE;
  const rows = approaches.slice(start, start + PAGE_SIZE);

  return (
    <Card className="approach-table">
      <div className="approach-table__header">
        <div>
          <h1 className="card__title">Trade Approaches</h1>
          <p className="approach-table__subtitle">Define how your campaigns discover &amp; manage options trade.</p>
        </div>
        <Link to="/trade-approaches/new" className="btn btn--primary approach-table__create">
          <span className="btn__icon" aria-hidden="true">
            +
          </span>
          Create New Approach
        </Link>
      </div>

      {notice}

      {total === 0 ? (
        <div className="approach-table__empty">
          No approaches yet. Create one to tell the AI how to find and manage trades.
        </div>
      ) : (
        <div className="approach-table__scroll">
          <table>
            <thead>
              <tr>
                {COLUMNS.map((c) => (
                  <th key={c}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <ApproachRow key={a.id} approach={a} onEdit={onEdit} onDelete={onDelete} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="approach-table__footer">
        <span>
          Showing {total ? start + 1 : 0}–{start + rows.length} of {total} approach{total === 1 ? '' : 'es'}
        </span>
        {totalPages > 1 && <Pagination page={current} totalPages={totalPages} onChange={setPage} />}
      </div>
    </Card>
  );
}

export default ApproachTable;
