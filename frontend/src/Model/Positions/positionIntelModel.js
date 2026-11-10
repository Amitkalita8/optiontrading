import { getJSON, postJSON } from "../../Utils/api";

// Engine 02 — Existing Position Intelligence (backend: internal/positionintel).
// The backend monitors every open position, reassesses it against its entry
// assumptions, the campaign's risk limits and goal, and recommends the best
// action (hold, close, roll, reduce) with the resulting position.

export const HEALTH = {
  action_needed: { label: "Action needed", tone: "alert" },
  expired: { label: "Expired", tone: "alert" },
  watch: { label: "Watch", tone: "warn" },
  healthy: { label: "Healthy", tone: "ok" },
  needs_details: { label: "Needs details", tone: "muted" },
  unavailable: { label: "No data", tone: "muted" },
};

export const ACTION_BUTTON = {
  hold: "Mark as Reviewed",
  close: "Close Position",
  roll: "Roll Position",
  reduce: "Reduce Position",
  record_expiry: "Record Outcome",
};

// Open positions with health and recommended action, most urgent first.
export async function fetchPositionIntel() {
  const data = await getJSON("/api/positions/intelligence");
  return data.positions || [];
}

// Full assessment for one position (refresh = reassess now).
export function fetchPositionAssessment(id, refresh = false) {
  return getJSON(
    `/api/positions/${encodeURIComponent(id)}/intelligence${refresh ? "?refresh=1" : ""}`,
  );
}

// Confirm an action. The server reprices first and answers 409 (code
// "stale") if the action is gone or its net credit moved.
export function applyPositionAction(id, action) {
  return postJSON(`/api/positions/${encodeURIComponent(id)}/actions`, {
    actionId: action.id,
    reviewedNetCredit: action.netCredit,
  });
}

export const ivLevel = (iv) =>
  iv >= 45 ? "High" : iv >= 25 ? "Normal" : "Low";

export const signedMoney = (v, digits = 2) => {
  const n = Number(v) || 0;
  const s = Math.abs(n).toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return `${n < 0 ? "-" : "+"}$${s}`;
};
