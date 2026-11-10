import { Link } from "react-router-dom";
import "../../Common/Button/Button.css";
import "./OpportunityStatus.css";

function minutesAgo(iso) {
  const min = Math.max(
    0,
    Math.round((Date.now() - new Date(iso).getTime()) / 60000),
  );
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  return `${h} h ago`;
}

const PHASES = {
  open: "Market open",
  "pre-market": "Pre-market",
  "after-hours": "After hours",
  closed: "Market closed",
};

// One line under a heading: freshness, market phase, data quality, refresh.
export function ScanMeta({ scan, onRefresh, refreshing }) {
  if (!scan) return null;
  return (
    <div className="opp-status__meta">
      <span>
        <span
          className={`opp-status__dot opp-status__dot--${scan.marketPhase === "open" ? "live" : "idle"}`}
          aria-hidden="true"
        />
        {PHASES[scan.marketPhase] || scan.marketPhase} · updated{" "}
        {minutesAgo(scan.generatedAt)} · {scan.scanned} symbols,{" "}
        {scan.evaluated} trades scored
        {scan.dataQuality === "last-trade" && " · priced from last trades"}
        {scan.stale && " · showing the last good scan"}
      </span>
      {onRefresh && (
        <button
          type="button"
          className="opp-status__refresh"
          onClick={onRefresh}
          disabled={refreshing}
        >
          {refreshing ? "Scanning…" : "Refresh"}
        </button>
      )}
    </div>
  );
}

// Empty / error states for the engine.
export function OpportunityNotice({ error, scan, onRetry }) {
  if (error?.code === "no_campaign") {
    return (
      <div className="opp-status__notice">
        <strong>No campaign yet</strong>
        <p>
          Create a campaign and the engine starts finding option-selling trades
          for its goal.
        </p>
        <Link to="/campaigns" className="btn btn--primary">
          Go to campaigns
        </Link>
      </div>
    );
  }
  if (error?.code === "no_watchlist") {
    return (
      <div className="opp-status__notice">
        <strong>Link a watchlist</strong>
        <p>{error.message}</p>
        <Link to="/dashboard" className="btn btn--primary">
          Choose a watchlist
        </Link>
      </div>
    );
  }
  if (error) {
    return (
      <div className="opp-status__notice" role="alert">
        <strong>Couldn&apos;t load opportunities</strong>
        <p>{error.message}</p>
        {onRetry && (
          <button type="button" className="btn btn--outline" onClick={onRetry}>
            Try again
          </button>
        )}
      </div>
    );
  }
  if (scan && scan.opportunities.length === 0) {
    return (
      <div className="opp-status__notice">
        <strong>No trade fits your approach right now</strong>
        <p>
          The engine scanned {scan.scanned}{" "}
          {scan.scanned === 1 ? "symbol" : "symbols"} from{" "}
          {scan.watchlist || "your watchlist"}. Try a wider holding duration,
          another strategy or a higher risk level.
        </p>
        {scan.skipped?.length > 0 && (
          <ul className="opp-status__skipped">
            {scan.skipped.map((s) => (
              <li key={s.symbol}>
                <b>{s.symbol}</b>: {s.reason}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }
  return null;
}
