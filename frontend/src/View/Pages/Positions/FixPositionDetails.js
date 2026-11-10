import { useState } from "react";
import Card from "../../Components/Common/Card/Card";
import { updatePosition } from "../../../Model/Positions/positionModel";

const EMPTY_LEG = { action: "sell", type: "put", strike: "", premium: "" };

// Default legs for strategies stored without them.
function starterLegs(strategy) {
  const s = (strategy || "").toLowerCase();
  if (s.includes("condor")) {
    return [
      { action: "buy", type: "put", strike: "", premium: "" },
      { action: "sell", type: "put", strike: "", premium: "" },
      { action: "sell", type: "call", strike: "", premium: "" },
      { action: "buy", type: "call", strike: "", premium: "" },
    ];
  }
  if (s.includes("strangle") || s.includes("straddle")) {
    return [
      { action: "sell", type: "put", strike: "", premium: "" },
      { action: "sell", type: "call", strike: "", premium: "" },
    ];
  }
  return [{ ...EMPTY_LEG, type: s.includes("call") ? "call" : "put" }];
}

// Engine 02 can't price a position without a valid expiry and its legs; this
// lets the user supply them so monitoring can start.
function FixPositionDetails({ assessment: a, onSaved }) {
  const badExpiry = /expiry/i.test(a.healthReason);
  const [expiry, setExpiry] = useState("");
  const [legs, setLegs] = useState(() => starterLegs(a.strategy));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const setLeg = (i, key, value) =>
    setLegs((ls) => ls.map((l, j) => (j === i ? { ...l, [key]: value } : l)));

  const save = async (e) => {
    e.preventDefault();
    setError(null);
    const parsed = legs.map((l) => ({
      action: l.action,
      type: l.type,
      strike: Number(l.strike),
      premium: Number(l.premium) || 0,
    }));
    if (!badExpiry && parsed.some((l) => !(l.strike > 0))) {
      setError("Enter a strike for every leg.");
      return;
    }
    if (badExpiry && !/^\d{4}-\d{2}-\d{2}$/.test(expiry)) {
      setError("Choose the expiry date.");
      return;
    }
    setSaving(true);
    try {
      const credit = parsed.reduce(
        (sum, l) => sum + (l.action === "sell" ? l.premium : -l.premium),
        0,
      );
      await updatePosition(
        a.positionId,
        badExpiry
          ? { expiry }
          : {
              legs: parsed,
              ...(credit > 0 && {
                premiumCredit: Math.round(credit * 10000) / 100,
              }),
            },
      );
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="pos-detail__card pos-fix">
      <div className="pos-detail__card-header">
        <h2 className="pos-detail__card-title">
          {badExpiry ? "Fix the expiry date" : "Add the leg details"}
        </h2>
        <p className="pos-detail__card-subtitle">
          {a.healthReason} Once saved, the engine starts monitoring this
          position.
        </p>
      </div>
      <form onSubmit={save} className="pos-fix__form">
        {badExpiry ? (
          <label className="pos-fix__field">
            <span>Expiry date</span>
            <input
              type="date"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
              required
            />
          </label>
        ) : (
          <>
            <div className="pos-fix__legs" role="group" aria-label="Legs">
              {legs.map((l, i) => (
                <div className="pos-fix__leg" key={i}>
                  <label className="pos-fix__field">
                    <span>Side</span>
                    <select
                      value={l.action}
                      onChange={(e) => setLeg(i, "action", e.target.value)}
                    >
                      <option value="sell">Sell</option>
                      <option value="buy">Buy</option>
                    </select>
                  </label>
                  <label className="pos-fix__field">
                    <span>Type</span>
                    <select
                      value={l.type}
                      onChange={(e) => setLeg(i, "type", e.target.value)}
                    >
                      <option value="put">Put</option>
                      <option value="call">Call</option>
                    </select>
                  </label>
                  <label className="pos-fix__field">
                    <span>Strike</span>
                    <input
                      inputMode="decimal"
                      value={l.strike}
                      onChange={(e) => setLeg(i, "strike", e.target.value)}
                      placeholder="e.g. 180"
                    />
                  </label>
                  <label className="pos-fix__field">
                    <span>Premium / share</span>
                    <input
                      inputMode="decimal"
                      value={l.premium}
                      onChange={(e) => setLeg(i, "premium", e.target.value)}
                      placeholder="e.g. 1.25"
                    />
                  </label>
                  {legs.length > 1 && (
                    <button
                      type="button"
                      className="pos-fix__remove"
                      onClick={() =>
                        setLegs((ls) => ls.filter((_, j) => j !== i))
                      }
                      aria-label={`Remove leg ${i + 1}`}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
            {legs.length < 4 && (
              <button
                type="button"
                className="pos-fix__add"
                onClick={() => setLegs((ls) => [...ls, { ...EMPTY_LEG }])}
              >
                + Add leg
              </button>
            )}
          </>
        )}
        {error && (
          <p className="pos-intel__apply-error" role="alert">
            {error}
          </p>
        )}
        <div>
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? "Saving…" : "Save and assess"}
          </button>
        </div>
      </form>
    </Card>
  );
}

export default FixPositionDetails;
