import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Card from "../../Components/Common/Card/Card";
import Pagination from "../../Components/Common/Pagination/Pagination";
import TickerLogo from "../../Components/Common/TickerLogo/TickerLogo";
import CampaignApproachModal from "../../Components/CampaignApproachModal/CampaignApproachModal";
import {
  HEALTH,
  fetchPositionIntel,
  ivLevel,
  signedMoney,
} from "../../../Model/Positions/positionIntelModel";
import "../../Components/Common/Button/Button.css";
import "./PositionsPage.css";

const PAGE_SIZE = 10;
const IV_COLORS = {
  High: "var(--red-600)",
  Normal: "var(--orange-text)",
  Low: "var(--green-600)",
};
const REFRESH_MS = 5 * 60 * 1000; // the engine reassesses in the background

// Engine 02: every open position with its health and best next action.
function PositionsPage() {
  const navigate = useNavigate();
  const [state, setState] = useState({
    status: "loading",
    rows: [],
    error: null,
    at: null,
  });
  const [page, setPage] = useState(1);
  const [approachModalOpen, setApproachModalOpen] = useState(false);

  const load = useCallback((quiet) => {
    if (!quiet)
      setState((s) => ({
        ...s,
        status: s.rows.length ? "refreshing" : "loading",
        error: null,
      }));
    return fetchPositionIntel()
      .then((rows) =>
        setState({ status: "ready", rows, error: null, at: new Date() }),
      )
      .catch((error) =>
        setState((s) => ({
          ...s,
          status: s.rows.length ? "ready" : "error",
          error,
        })),
      );
  }, []);

  useEffect(() => {
    load(false);
    const t = setInterval(() => load(true), REFRESH_MS);
    return () => clearInterval(t);
  }, [load]);

  const { rows, status, error } = state;
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  const current = rows.slice(start, start + PAGE_SIZE);
  const counts = rows.reduce(
    (acc, r) => ({ ...acc, [r.health]: (acc[r.health] || 0) + 1 }),
    {},
  );

  const handleDownloadReport = () => {
    const csvRows = [
      [
        "Symbol",
        "Position",
        "Health",
        "Next action",
        "Open P&L ($)",
        "Open P&L (%)",
        "Entry price",
        "Delta",
        "Theta ($/day)",
        "IV (%)",
        "Goal contribution (%)",
      ],
      ...rows.map((r) => [
        r.symbol,
        `"${r.strategy} - ${r.description || ""}"`,
        HEALTH[r.health]?.label || r.health,
        `"${r.action}"`,
        r.overview?.openPL ?? "",
        r.overview?.openPLPct ?? "",
        r.overview?.entryOptionPrice ?? "",
        r.current?.delta ?? "",
        r.current?.theta ?? "",
        r.current?.iv ?? "",
        r.overview?.goalContributionPct ?? "",
      ]),
    ];
    const blob = new Blob([csvRows.map((e) => e.join(",")).join("\n")], {
      type: "text/csv",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `positions_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="positions-view">
      <Card className="positions-card">
        <div className="positions-card__header">
          <div>
            <h1 className="positions-card__title">Existing Positions</h1>
            <p className="positions-card__subtitle">
              Best actions for your open positions, reassessed against live
              prices, your risk limits and campaign goal
            </p>
            <div className="positions-card__status">
              {[
                "action_needed",
                "expired",
                "watch",
                "healthy",
                "needs_details",
              ].map(
                (h) =>
                  counts[h] > 0 && (
                    <span
                      key={h}
                      className={`health-chip health-chip--${HEALTH[h].tone}`}
                    >
                      {counts[h]} {HEALTH[h].label.toLowerCase()}
                    </span>
                  ),
              )}
              {state.at && (
                <span className="positions-card__updated">
                  Updated{" "}
                  {state.at.toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              )}
              <button
                type="button"
                className="positions-card__refresh"
                onClick={() => load(false)}
                disabled={status === "refreshing" || status === "loading"}
              >
                {status === "refreshing" ? "Checking…" : "Refresh"}
              </button>
            </div>
          </div>

          <button
            type="button"
            className="btn btn--outline-accent positions-card__approach-btn"
            onClick={() => setApproachModalOpen(true)}
          >
            <span className="positions-card__approach-icon" aria-hidden="true">
              ♟
            </span>
            <span>Approach</span>
          </button>
        </div>

        {status === "loading" && (
          <div
            className="positions-card__skeleton"
            aria-busy="true"
            aria-label="Assessing positions"
          >
            {[0, 1, 2].map((i) => (
              <div key={i} />
            ))}
          </div>
        )}
        {status === "error" && (
          <div className="positions-card__notice" role="alert">
            <strong>Couldn&apos;t assess your positions</strong>
            <p>{error?.message}</p>
            <button
              type="button"
              className="btn btn--outline"
              onClick={() => load(false)}
            >
              Try again
            </button>
          </div>
        )}
        {status !== "loading" && status !== "error" && total === 0 && (
          <div className="positions-card__notice">
            <strong>No open positions</strong>
            <p>
              Positions you place from an opportunity appear here, and the
              engine starts monitoring them right away.
            </p>
            <Link to="/opportunities" className="btn btn--primary">
              Find opportunities
            </Link>
          </div>
        )}

        {total > 0 && (
          <div className="positions-card__table-wrap">
            <table className="positions-table">
              <thead>
                <tr>
                  <th className="positions-table__th--symbol">SYMBOL</th>
                  <th className="positions-table__th--pos">POSITION</th>
                  <th className="positions-table__th--pl">OPEN P&amp;L (%)</th>
                  <th>ENTRY PRICE</th>
                  <th>DELTA</th>
                  <th>THETA</th>
                  <th>IMPLIED VOLATILITY</th>
                  <th>GOAL CONTRIBUTION</th>
                  <th className="positions-table__th--action">NEXT ACTION</th>
                </tr>
              </thead>
              <tbody>
                {current.map((r) => {
                  const ov = r.overview || {};
                  const cur = r.current;
                  const pl = ov.openPL || 0;
                  const health = HEALTH[r.health] || HEALTH.unavailable;
                  const level = cur ? ivLevel(cur.iv) : null;
                  return (
                    <tr
                      key={r.positionId}
                      className="positions-table__row positions-table__row--clickable"
                      onClick={() => navigate(`/positions/${r.positionId}`)}
                    >
                      <td className="positions-table__td--symbol">
                        <Link
                          to={`/positions/${r.positionId}`}
                          className="positions-table__symbol-link"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <TickerLogo ticker={r.symbol} size={36} />
                          <span className="positions-table__symbol-name">
                            {r.symbol}
                          </span>
                        </Link>
                      </td>
                      <td className="positions-table__td--pos">
                        <div className="positions-table__pos-title">
                          {r.strategy}
                        </div>
                        <div className="positions-table__pos-sub">
                          {r.description}
                        </div>
                      </td>
                      <td className="positions-table__td--pl">
                        {r.health === "unavailable" ? (
                          "—"
                        ) : (
                          <div
                            className={`positions-table__pl ${pl >= 0 ? "is-positive" : "is-negative"}`}
                          >
                            <span className="positions-table__pl-val">
                              {signedMoney(pl, 0)}
                            </span>
                            <span className="positions-table__pl-pct">
                              ({pl >= 0 ? "+" : ""}
                              {ov.openPLPct}%)
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="positions-table__td--numeric">
                        {ov.entryOptionPrice
                          ? `$${ov.entryOptionPrice.toFixed(2)}`
                          : "—"}
                      </td>
                      <td
                        className="positions-table__td--numeric"
                        title={
                          cur
                            ? `Position delta: ${cur.delta.toFixed(0)} shares`
                            : undefined
                        }
                      >
                        {cur ? cur.shortDelta.toFixed(2) : "—"}
                      </td>
                      <td className="positions-table__td--numeric">
                        {cur ? `${signedMoney(cur.theta)}/d` : "—"}
                      </td>
                      <td className="positions-table__td--iv">
                        {cur ? (
                          <div className="positions-table__iv-cell">
                            <span className="positions-table__iv-pct">
                              {cur.iv.toFixed(1)}%
                            </span>
                            <span
                              className="positions-table__iv-dot"
                              style={{ backgroundColor: IV_COLORS[level] }}
                            />
                            <span className="positions-table__iv-level">
                              {level}
                            </span>
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="positions-table__td--numeric">
                        {ov.goalContributionPct != null
                          ? `${ov.goalContributionPct.toFixed(1)}%`
                          : "—"}
                      </td>
                      <td className="positions-table__td--action">
                        <Link
                          to={`/positions/${r.positionId}`}
                          className="positions-table__next"
                          onClick={(e) => e.stopPropagation()}
                          title={r.healthReason}
                        >
                          <span
                            className={`health-chip health-chip--${health.tone}`}
                          >
                            {health.label}
                          </span>
                          <span className="positions-table__next-action">
                            {r.action} ›
                          </span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {total > 0 && (
          <div className="positions-card__footer">
            <span className="positions-card__count-text">
              Showing {start + 1}–{Math.min(start + PAGE_SIZE, total)} of{" "}
              {total} open positions
            </span>
            {totalPages > 1 && (
              <Pagination
                page={page}
                totalPages={totalPages}
                onChange={setPage}
              />
            )}
          </div>
        )}
      </Card>

      <Card className="trade-report-card">
        <div className="trade-report-card__inner">
          <div className="trade-report-card__info">
            <h2 className="trade-report-card__title">Trade Report</h2>
            <p className="trade-report-card__subtitle">
              Every open, close and roll the engine recorded, with prices and
              notes
            </p>
          </div>
          <div className="trade-report-card__actions">
            <Link
              to="/trade-log"
              className="btn btn--primary trade-report-card__view-btn"
            >
              View Report →
            </Link>
            <button
              type="button"
              className="btn btn--outline-accent trade-report-card__download-btn"
              onClick={handleDownloadReport}
              disabled={total === 0}
            >
              Download CSV
            </button>
          </div>
        </div>
      </Card>

      <CampaignApproachModal
        isOpen={approachModalOpen}
        onClose={() => setApproachModalOpen(false)}
      />
    </div>
  );
}

export default PositionsPage;
