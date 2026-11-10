import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Card from "../../Components/Common/Card/Card";
import TickerLogo from "../../Components/Common/TickerLogo/TickerLogo";
import ErrorState from "../../Components/Common/ErrorState/ErrorState";
import { getCompany } from "../../../Model/Companies/companyModel";
import {
  ACTION_BUTTON,
  HEALTH,
  applyPositionAction,
  fetchPositionAssessment,
  signedMoney,
} from "../../../Model/Positions/positionIntelModel";
import { formatCurrency, formatPrice } from "../../../Utils/format";
import FixPositionDetails from "./FixPositionDetails";
import "../../Components/Common/Button/Button.css";
import "../../Components/Opportunities/DecisionLayer/DecisionLayer.css";
import "./PositionOpportunityDetailsPage.css";
import "./PositionDetailsPage.css";

const fmtDate = (iso) =>
  iso
    ? new Date(`${iso}T12:00:00Z`).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";
const money = (v) => (v == null ? "Unlimited" : formatCurrency(v));
const num = (v, d = 2) => (v == null ? "—" : Number(v).toFixed(d));

// Rows of the before → after comparison: [label, value(m), better(after, before)].
const IMPACT_ROWS = [
  [
    "Strikes",
    (m) =>
      m.strikes.replace(/sell |buy /g, (s) =>
        s === "sell " ? "Short " : "Long ",
      ),
  ],
  ["Expiry", (m) => `${fmtDate(m.expiry)} (${m.dte}d)`],
  ["Contracts", (m) => m.contracts],
  [
    "Premium collected",
    (m) => formatCurrency(m.creditTotal),
    (a, b) => a.creditTotal > b.creditTotal,
  ],
  [
    "Breakeven",
    (m) =>
      m.breakevenHigh
        ? `${formatPrice(m.breakeven)} – ${formatPrice(m.breakevenHigh)}`
        : formatPrice(m.breakeven),
  ],
  [
    "Probability of profit",
    (m) => `${num(m.pop, 0)}%`,
    (a, b) => a.pop > b.pop,
  ],
  [
    "Max risk",
    (m) => money(m.maxRisk),
    (a, b) => (a.maxRisk ?? Infinity) < (b.maxRisk ?? Infinity),
  ],
  [
    "Delta (shares)",
    (m) => num(m.delta, 0),
    (a, b) => Math.abs(a.delta) < Math.abs(b.delta),
  ],
  [
    "Short-strike delta",
    (m) => num(m.shortDelta),
    (a, b) => a.shortDelta < b.shortDelta,
  ],
  ["Theta", (m) => `${signedMoney(m.theta)}/day`, (a, b) => a.theta > b.theta],
  [
    "Exposure",
    (m) => formatCurrency(Math.abs(m.exposure)),
    (a, b) => Math.abs(a.exposure) < Math.abs(b.exposure),
  ],
  [
    "Capital use",
    (m) => `${num(m.capitalUsePct, 1)}%`,
    (a, b) => a.capitalUsePct < b.capitalUsePct,
  ],
];

function CheckList({ items }) {
  return (
    <ul className="decision__checks">
      {items.map((c) => (
        <li key={c.label} className={c.pass ? "is-pass" : "is-fail"}>
          <span className="decision__check-icon" aria-hidden="true">
            {c.pass ? "✓" : "!"}
          </span>
          <span>
            <b>{c.label}</b>
            <span className="decision__check-detail">{c.detail}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

// Engine 02: one open position, what changed, the best action and its result.
function PositionDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState({
    status: "loading",
    a: null,
    error: null,
  });
  const [selectedId, setSelectedId] = useState(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState(null);
  const [done, setDone] = useState(null);

  const load = useCallback(
    (refresh) => {
      setState((s) => ({
        ...s,
        status: s.a ? "refreshing" : "loading",
        error: null,
      }));
      fetchPositionAssessment(id, refresh)
        .then((a) => {
          setState({ status: "ready", a, error: null });
          setSelectedId(a.recommendation.id);
          setAcknowledged(false);
        })
        .catch((error) => setState({ status: "error", a: null, error }));
    },
    [id],
  );
  useEffect(() => load(false), [load]);

  const a = state.a;
  const actions = useMemo(
    () => (a ? [a.recommendation, ...a.alternatives] : []),
    [a],
  );
  const action = actions.find((x) => x.id === selectedId) || a?.recommendation;

  if (state.status === "loading") {
    return (
      <div className="pos-detail" aria-busy="true">
        <div className="pos-detail__skeleton" style={{ height: 110 }} />
        <div className="pos-detail__skeleton" style={{ height: 320 }} />
      </div>
    );
  }
  if (state.status === "error") {
    const closed = state.error?.status === 409 || state.error?.status === 404;
    return (
      <ErrorState
        message={
          closed
            ? state.error.message
            : `Couldn't assess this position. ${state.error?.message || ""}`
        }
        onRetry={closed ? undefined : () => load(false)}
      />
    );
  }

  if (a.health === "needs_details") {
    return (
      <div className="pos-detail">
        <header className="pos-detail__header">
          <Link to="/positions" className="pos-detail__back-link">
            ← Back to Existing Positions
          </Link>
          <h1 className="pos-detail__title">
            {a.symbol} · {a.strategy}
          </h1>
          <p className="pos-detail__subtitle">
            <span className="health-chip health-chip--muted">
              Needs details
            </span>{" "}
            {a.description}
          </p>
        </header>
        <FixPositionDetails assessment={a} onSaved={() => load(true)} />
      </div>
    );
  }

  const ov = a.overview;
  const cur = a.current;
  const after = action.result;
  const isRec = action.id === a.recommendation.id;
  const health = HEALTH[a.health] || HEALTH.unavailable;
  const company = getCompany(a.symbol);
  const d = a.decision;

  const confirm = async () => {
    setApplying(true);
    setApplyError(null);
    try {
      setDone(await applyPositionAction(a.positionId, action));
    } catch (err) {
      setApplyError(err.message);
      if (err.code === "stale") load(true);
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="pos-detail">
      <header className="pos-detail__header">
        <Link to="/positions" className="pos-detail__back-link">
          ← Back to Existing Positions
        </Link>
        <h1 className="pos-detail__title">Position Details</h1>
        <p className="pos-detail__subtitle">
          <span className={`health-chip health-chip--${health.tone}`}>
            {health.label}
          </span>{" "}
          {a.healthReason}
        </p>
        <p className="pos-intel__meta">
          {a.campaign ? (
            <>
              Judged against <b>{a.campaign.name}</b> ({a.campaign.risk} risk)
              ·{" "}
            </>
          ) : (
            "No campaign linked: default moderate risk · "
          )}
          {a.priceSource === "live"
            ? "live quotes"
            : a.priceSource === "estimated"
              ? "some legs estimated"
              : "last-trade prices"}{" "}
          · assessed{" "}
          {new Date(a.generatedAt).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          })}{" "}
          <button
            type="button"
            className="pos-intel__refresh"
            onClick={() => load(true)}
            disabled={state.status === "refreshing"}
          >
            {state.status === "refreshing" ? "Reassessing…" : "Reassess now"}
          </button>
        </p>
      </header>

      {/* 1. Position overview */}
      <Card className="pos-detail__summary-card">
        <div className="pos-detail__company-col">
          <TickerLogo ticker={a.symbol} size={48} />
          <div className="pos-detail__company-text">
            <span className="pos-detail__symbol">{a.symbol}</span>
            <span className="pos-detail__company-name">
              {(company?.name || a.symbol).toUpperCase()}
            </span>
          </div>
        </div>
        <div className="pos-detail__metrics-strip">
          <div className="pos-detail__metric-item">
            <span className="pos-detail__metric-label">Current Price</span>
            <span className="pos-detail__metric-val">
              {formatPrice(ov.underlying)}
            </span>
            {ov.entryUnderlying > 0 && (
              <span
                className={`pos-detail__metric-sub ${ov.underlyingChangePct >= 0 ? "pos-detail__metric-sub--pos" : "pos-detail__metric-sub--neg"}`}
              >
                {ov.underlyingChangePct >= 0 ? "+" : ""}
                {ov.underlyingChangePct}% since entry
              </span>
            )}
          </div>
          <div className="pos-detail__metric-item">
            <span className="pos-detail__metric-label">Position</span>
            <span className="pos-detail__metric-val">{a.strategy}</span>
            <span className="pos-detail__metric-sub">{a.description}</span>
          </div>
          <div className="pos-detail__metric-item">
            <span className="pos-detail__metric-label">Entry Price</span>
            <span className="pos-detail__metric-val">
              {formatPrice(ov.entryOptionPrice)}
            </span>
            <span className="pos-detail__metric-sub">
              now {formatPrice(ov.currentOptionPrice)}
            </span>
          </div>
          <div className="pos-detail__metric-item">
            <span className="pos-detail__metric-label">Days to Expire</span>
            <span className="pos-detail__metric-val">{ov.dte}D</span>
            <span className="pos-detail__metric-sub">{fmtDate(ov.expiry)}</span>
          </div>
          <div className="pos-detail__metric-item">
            <span className="pos-detail__metric-label">Open P&amp;L</span>
            <span
              className={`pos-detail__metric-val ${ov.openPL >= 0 ? "pos-detail__metric-val--pos" : "pos-detail__metric-val--neg"}`}
            >
              {signedMoney(ov.openPL)}
            </span>
            <span className="pos-detail__metric-sub">
              {ov.profitCapturedPct >= 0
                ? `${ov.profitCapturedPct}% of premium captured`
                : `option loss ${(-ov.profitCapturedPct / 100).toFixed(1)}× the credit`}
              {ov.sharePL ? ` · shares ${signedMoney(ov.sharePL, 0)}` : ""}
            </span>
          </div>
          <div className="pos-detail__metric-item">
            <span className="pos-detail__metric-label">Goal Contribution</span>
            <span className="pos-detail__metric-val">
              {num(ov.goalContributionPct, 1)}%
            </span>
            <span className="pos-detail__metric-sub">
              {num(ov.weeklyContributionPct, 0)}% of weekly target from decay
            </span>
          </div>
        </div>
      </Card>

      <div className="pos-detail__grid">
        <div className="pos-detail__col-main">
          {/* 2. AI recommendation */}
          <Card className="pos-detail__card">
            <div className="pos-detail__card-header">
              <h2 className="pos-detail__card-title">AI Recommendation</h2>
              <p className="pos-detail__card-subtitle">
                Based on market conditions, the position&apos;s entry
                assumptions and your campaign goal.
              </p>
            </div>

            <div className="pos-detail__recom-banner">
              <div className="pos-detail__recom-left">
                <div className="pos-detail__recom-icon-wrap" aria-hidden="true">
                  ↗
                </div>
                <div className="pos-detail__recom-text">
                  <h3 className="pos-detail__recom-action-title">
                    {a.recommendation.title}
                  </h3>
                  <p className="pos-detail__recom-action-desc">
                    {a.recommendation.summary}
                  </p>
                </div>
              </div>
              <div className="pos-detail__recom-confidence">
                <span className="pos-detail__confidence-label">Confidence</span>
                <div className="pos-detail__confidence-circle">
                  <span>{d.confidencePct}%</span>
                </div>
              </div>
            </div>

            {a.changes.length > 0 && (
              <h4 className="pos-detail__section-title">What changed</h4>
            )}
            <ul className="pos-intel__changes">
              {a.changes.map((c) => (
                <li key={c.label} className={`is-${c.tone}`}>
                  <span className="pos-intel__change-label">{c.label}</span>
                  <span className="pos-intel__change-vals">
                    {c.from} <span aria-hidden="true">→</span>
                    <span className="decision__sr"> to </span> <b>{c.to}</b>
                  </span>
                  {c.detail && (
                    <span className="pos-intel__change-detail">{c.detail}</span>
                  )}
                </li>
              ))}
            </ul>

            <h4 className="pos-detail__section-title">Choose an action</h4>
            <div
              className="pos-intel__choices"
              role="radiogroup"
              aria-label="Actions the engine considered"
            >
              {actions.map((x) => (
                <button
                  type="button"
                  role="radio"
                  aria-checked={x.id === action.id}
                  key={x.id}
                  className={`pos-intel__choice ${x.id === action.id ? "is-selected" : ""}`}
                  onClick={() => {
                    setSelectedId(x.id);
                    setAcknowledged(false);
                    setApplyError(null);
                  }}
                >
                  <span className="pos-intel__choice-title">
                    {x.title}
                    {x.id === a.recommendation.id && (
                      <span className="pos-intel__badge">Recommended</span>
                    )}
                  </span>
                  <span className="pos-intel__choice-score">{x.score}</span>
                </button>
              ))}
            </div>

            <div className="pos-detail__action-effects">
              <h4 className="pos-detail__section-title">
                What this action does
              </h4>
              {!isRec && (
                <p className="pos-intel__not-rec">
                  The engine prefers <b>{a.recommendation.title}</b> (
                  {a.recommendation.score} vs {action.score}). {action.summary}
                </p>
              )}
              <div className="pos-detail__effects-grid">
                <div className="pos-detail__effect-tile">
                  <span className="pos-detail__effect-label">
                    Goal contribution
                  </span>
                  <span className="pos-detail__effect-val pos-detail__effect-val--green">
                    {num(action.goalContributionPct, 1)}%
                  </span>
                  <span className="pos-detail__effect-desc">
                    {action.goalImpactPct >= 0 ? "+" : ""}
                    {num(action.goalImpactPct, 1)} pts vs holding
                  </span>
                </div>
                <div className="pos-detail__effect-tile">
                  <span className="pos-detail__effect-label">
                    {action.netCredit >= 0 ? "Additional premium" : "Cost now"}
                  </span>
                  <span
                    className={`pos-detail__effect-val ${action.netCredit >= 0 ? "pos-detail__effect-val--green" : ""}`}
                  >
                    {signedMoney(action.netCredit)}
                  </span>
                  <span className="pos-detail__effect-desc">
                    {action.realizedPL
                      ? `Locks ${signedMoney(action.realizedPL)}`
                      : "Net of closing costs"}
                  </span>
                </div>
                <div className="pos-detail__effect-tile">
                  <span className="pos-detail__effect-label">New expiry</span>
                  <span className="pos-detail__effect-val">
                    {action.additionalDays ? `+${action.additionalDays}D` : "—"}
                  </span>
                  <span className="pos-detail__effect-desc">
                    {action.newExpiry ? fmtDate(action.newExpiry) : "Unchanged"}
                  </span>
                </div>
                <div className="pos-detail__effect-tile">
                  <span className="pos-detail__effect-label">Positioning</span>
                  <span className="pos-detail__effect-val">
                    {action.positioning}
                  </span>
                  <span className="pos-detail__effect-desc">
                    {action.newStrikes
                      ? `New strike ${action.newStrikes}`
                      : "Strikes unchanged"}
                  </span>
                </div>
              </div>
              {(action.playbook?.length > 0 ||
                action.tradeoffs?.length > 0) && (
                <ul className="pos-intel__playbook">
                  {action.playbook.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                  {action.tradeoffs.map((p) => (
                    <li key={p} className="is-tradeoff">
                      {p}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>

          {/* 3 + 4. Action impact and risk analysis */}
          <Card className="pos-detail__card">
            <div className="pos-detail__card-header">
              <h2 className="pos-detail__card-title">
                Risk &amp; Impact Analysis
              </h2>
              <p className="pos-detail__card-subtitle">
                The position now and after <b>{action.title.toLowerCase()}</b>
              </p>
            </div>
            {after && cur ? (
              <div className="pos-intel__impact-wrap">
                <table className="pos-intel__impact">
                  <thead>
                    <tr>
                      <th scope="col">Metric</th>
                      <th scope="col">Now</th>
                      <th scope="col">After</th>
                    </tr>
                  </thead>
                  <tbody>
                    {IMPACT_ROWS.map(([label, fmt, better]) => {
                      const nowV = String(fmt(cur));
                      const afterV = String(fmt(after));
                      const changed = nowV !== afterV;
                      const tone =
                        changed && better
                          ? better(after, cur)
                            ? "is-better"
                            : "is-worse"
                          : "";
                      return (
                        <tr key={label}>
                          <th scope="row">{label}</th>
                          <td>{nowV}</td>
                          <td className={tone}>{afterV}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="pos-intel__closed-note">
                Nothing stays open: {signedMoney(action.realizedPL)} is realized
                {cur
                  ? `, ${formatCurrency(cur.collateral)} of collateral is freed`
                  : ""}{" "}
                and no risk remains.
              </p>
            )}
          </Card>

          {/* 5. AI decision layer */}
          <Card className="pos-detail__card">
            <div className="pos-detail__card-header">
              <h2 className="pos-detail__card-title">AI Decision Layer</h2>
              <p className="pos-detail__card-subtitle">
                Why the engine recommends {a.recommendation.title.toLowerCase()}
              </p>
            </div>
            <p className="decision__lead">{d.summary}</p>
            <div className="decision__reasons">
              {d.reasons.map((r) => (
                <div key={r.title} className="decision__reason">
                  <span className="decision__reason-check" aria-hidden="true">
                    ✓
                  </span>
                  <div>
                    <b>{r.title}</b>
                    <span>{r.desc}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="decision__grid pos-intel__decision-grid">
              <section
                className={`decision__panel ${d.withinLimits ? "is-ok" : "is-warn"}`}
              >
                <h3 className="decision__head">Risk after the action</h3>
                <CheckList items={d.riskChecks} />
              </section>
              <section className="decision__panel">
                <h3 className="decision__head">What could change the call</h3>
                <ul className="decision__invalid">
                  {d.invalidation.map((r) => (
                    <li key={r.title}>
                      <b>{r.title}</b>
                      <span>{r.desc}</span>
                    </li>
                  ))}
                </ul>
              </section>
              <section className="decision__panel">
                <h3 className="decision__head">
                  Confidence · {d.confidence} {d.confidencePct}%
                </h3>
                <CheckList items={d.confidenceFactors} />
              </section>
            </div>
            <section className="decision__disclosures">
              <h3 className="decision__head">Risk disclosures</h3>
              {d.disclosures.map((t) => (
                <p key={t}>{t}</p>
              ))}
            </section>
          </Card>

          {/* User reviews and confirms */}
          <Card className="pos-detail__confirm-card">
            <div className="pos-detail__confirm-inner">
              <div className="pos-detail__confirm-content">
                <h4 className="pos-detail__confirm-title">
                  Confirm and acknowledge before you proceed
                </h4>
                <label className="pos-detail__checkbox-label">
                  <input
                    type="checkbox"
                    className="pos-detail__checkbox"
                    checked={acknowledged}
                    onChange={(e) => setAcknowledged(e.target.checked)}
                  />
                  <span>
                    I have reviewed{" "}
                    {action.kind === "hold"
                      ? "this position"
                      : `the ${action.title.toLowerCase()} details`}{" "}
                    and want to proceed
                  </span>
                </label>
                {applyError && (
                  <p className="pos-intel__apply-error" role="alert">
                    {applyError}
                  </p>
                )}
              </div>
              <button
                type="button"
                className="btn btn--primary pos-detail__roll-btn"
                disabled={!acknowledged || applying}
                onClick={confirm}
              >
                {applying
                  ? "Recording…"
                  : ACTION_BUTTON[action.kind] || "Confirm"}
              </button>
            </div>
          </Card>
        </div>

        <div className="pos-detail__col-side">
          <Card className="pos-detail__side-card">
            <h3 className="pos-detail__side-title">Current Position Details</h3>
            <div className="pos-detail__side-rows">
              {[
                ["Strategy", a.strategy],
                ["Legs", a.description],
                ["Contracts", `${ov.contracts} (${ov.contracts * 100} shares)`],
                ["Premium collected", formatCurrency(ov.credit)],
                ["Cost to close", formatCurrency(ov.costToClose)],
                ["Days held", ov.daysHeld],
                ["Expiry", fmtDate(ov.expiry)],
                [
                  "Entry assumptions",
                  a.entry.reconstructed ? "Reconstructed" : "Recorded at entry",
                ],
              ].map(([k, v]) => (
                <div className="pos-detail__side-row" key={k}>
                  <span className="pos-detail__side-key">{k}</span>
                  <span className="pos-detail__side-val">{v}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="pos-detail__side-card">
            <h3 className="pos-detail__side-title">
              Action Preview · {action.title}
            </h3>
            {action.steps.length === 0 ? (
              <p className="pos-intel__side-note">
                No orders: the engine keeps monitoring the position.
              </p>
            ) : (
              <ol className="pos-intel__steps">
                {action.steps.map((s, i) => (
                  <li key={i}>
                    <span className="pos-intel__step-side">{s.side}</span>{" "}
                    {s.contracts} × {s.description}
                    <span className="pos-intel__step-price">
                      @ {formatPrice(s.price)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
            <div className="pos-detail__side-rows">
              <div className="pos-detail__side-row">
                <span className="pos-detail__side-key">Net</span>
                <span
                  className={`pos-detail__side-val ${action.netCredit >= 0 ? "pos-detail__side-val--green" : ""}`}
                >
                  {signedMoney(action.netCredit)}
                </span>
              </div>
              {after && (
                <>
                  <div className="pos-detail__side-row">
                    <span className="pos-detail__side-key">New breakeven</span>
                    <span className="pos-detail__side-val">
                      {formatPrice(after.breakeven)}
                    </span>
                  </div>
                  <div className="pos-detail__side-row">
                    <span className="pos-detail__side-key">Max risk</span>
                    <span className="pos-detail__side-val">
                      {money(after.maxRisk)}
                    </span>
                  </div>
                  <div className="pos-detail__side-row">
                    <span className="pos-detail__side-key">POP</span>
                    <span className="pos-detail__side-val">
                      {num(after.pop, 0)}%
                    </span>
                  </div>
                </>
              )}
              <div className="pos-detail__side-row">
                <span className="pos-detail__side-key">Goal contribution</span>
                <span className="pos-detail__side-val pos-detail__side-val--green">
                  {num(action.goalContributionPct, 1)}%
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {done && (
        <div
          className="pos-detail__modal-backdrop"
          onClick={() => setDone(null)}
        >
          <div
            className="pos-detail__modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pos-done-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pos-detail__modal-icon">✓</div>
            <h3 className="pos-detail__modal-title" id="pos-done-title">
              {action.title} recorded
            </h3>
            <p className="pos-detail__modal-desc">{done.message}</p>
            {done.campaign && (
              <p className="pos-detail__modal-desc">
                {done.campaign.name}: {formatCurrency(done.campaign.earned)}{" "}
                earned so far.
              </p>
            )}
            <div className="pos-detail__modal-actions">
              <button
                type="button"
                className="btn btn--outline"
                onClick={() => navigate("/positions")}
              >
                Back to Positions
              </button>
              {done.opened ? (
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => navigate(`/positions/${done.opened.id}`)}
                >
                  View new position
                </button>
              ) : done.position?.status === "open" ? (
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => {
                    setDone(null);
                    load(false);
                  }}
                >
                  Done
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PositionDetailsPage;
