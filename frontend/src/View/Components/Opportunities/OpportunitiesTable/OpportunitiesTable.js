import { useState } from "react";
import useLiveQuotes from "../../../../Controller/useLiveQuotes";
import Card from "../../Common/Card/Card";
import Pagination from "../../Common/Pagination/Pagination";
import KebabButton from "../../Common/KebabButton/KebabButton";
import OpportunityRow from "./OpportunityRow";
import {
  OpportunityNotice,
  ScanMeta,
} from "../OpportunityStatus/OpportunityStatus";
import PipelineStrip from "../PipelineStrip/PipelineStrip";
import "./OpportunitiesTable.css";

const PAGE_SIZE = 10;
const COLUMNS = [
  "Symbol",
  "Strategy",
  "Current Price",
  "Strike Price",
  "Expiry",
  "Premium",
  "Annualized Yield",
  "Action",
];

function OpportunitiesTable({ opportunities, scan, onRefresh, refreshing }) {
  const [page, setPage] = useState(1);
  const total = opportunities.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  // Live underlying price for the visible rows; the engine priced the options at scan time.
  const { quotes } = useLiveQuotes(
    opportunities.slice(start, start + PAGE_SIZE).map((o) => o.symbol),
  );
  const rows = opportunities.slice(start, start + PAGE_SIZE).map((o) => {
    const live = quotes[o.symbol];
    return live ? { ...o, currentPrice: live.price } : o;
  });

  return (
    <Card className="opps-table">
      <div className="opps-table__header">
        <div>
          <h1 className="card__title">New Opportunities</h1>
          <p className="opps-table__subtitle">
            AI found {total} new {total === 1 ? "opportunity" : "opportunities"}{" "}
            for{" "}
            {scan?.campaignName ? <b>{scan.campaignName}</b> : "your campaign"}{" "}
            based on its goal, approach and watchlist.
          </p>
          <ScanMeta scan={scan} onRefresh={onRefresh} refreshing={refreshing} />
        </div>
        <KebabButton label="More options" variant="accent" size="lg" />
      </div>

      <PipelineStrip scan={scan} />

      {total === 0 && <OpportunityNotice scan={scan} />}

      {total > 0 && (
        <div className="opps-table__scroll">
          <table>
            <thead>
              <tr>
                {COLUMNS.map((col) => (
                  <th key={col}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <OpportunityRow key={o.id} opportunity={o} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="opps-table__footer">
        <span>
          Showing {total ? start + 1 : 0}–{start + rows.length} of {total}{" "}
          opportunities
        </span>
        {totalPages > 1 && (
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        )}
      </div>
    </Card>
  );
}

export default OpportunitiesTable;
