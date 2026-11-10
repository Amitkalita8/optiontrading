import { getJSON, postJSON } from '../../Utils/api';
import { getCompany } from '../Companies/companyModel';

// Engine 01 — AI Opportunity Discovery (backend: internal/opportunities).
// The backend scans the campaign's watchlist with live option chains, scores
// every candidate trade against the campaign goal and approach, and keeps the
// result fresh in the background. Errors carry `code`: no_campaign | no_watchlist.

const TONES = ['gray', 'green', 'blue', 'amber'];
const toneFor = (symbol) => TONES[[...symbol].reduce((n, ch) => n + ch.charCodeAt(0), 0) % TONES.length];

// Rows for the tables: what the engine returns plus a badge colour.
const toRow = (o) => ({ ...o, tone: toneFor(o.symbol) });

// Scan for a campaign (default: the user's active campaign).
export async function fetchOpportunities(campaignId) {
  const path = campaignId ? `/api/opportunities?campaignId=${encodeURIComponent(campaignId)}` : '/api/opportunities';
  const scan = await getJSON(path);
  return { ...scan, opportunities: (scan.opportunities || []).map(toRow) };
}

// Rescan now (ignores the cache).
export async function refreshOpportunities(campaignId) {
  const scan = await postJSON(`/api/campaigns/${campaignId}/opportunities/refresh`);
  return { ...scan, opportunities: (scan.opportunities || []).map(toRow) };
}

const fmtDate = (iso, opts = { month: 'short', day: 'numeric', year: 'numeric' }) =>
  iso ? new Date(`${iso}T12:00:00Z`).toLocaleDateString(undefined, opts) : '—';
const signed = (n, digits = 2) => `${n >= 0 ? '+' : ''}${n.toFixed(digits)}`;
const pct = (n) => Math.max(0, Math.min(100, Math.round(n)));

// Detail view model for /opportunities/:id.
export function toDetails({ opportunity: o, goal = {}, campaignId, campaignName, generatedAt, marketPhase }) {
  const company = getCompany(o.symbol);
  const target = goal.netTarget || 0;
  const earned = goal.earned || 0;
  const withTrade = earned + o.totalPremium;
  const earnedPct = target > 0 ? pct((earned / target) * 100) : 0;
  const withPct = target > 0 ? pct((withTrade / target) * 100) : 0;
  const twoSided = o.breakevenHigh > 0;
  return {
    ...o,
    tone: toneFor(o.symbol),
    companyName: (company?.name || o.symbol).toUpperCase(),
    strike: o.strikePrice,
    buyingPower: o.capitalRequired * o.contracts,
    delta: signed(o.delta),
    theta: `${o.theta >= 0 ? '+' : '-'}$${Math.abs(o.theta).toFixed(2)}/day`,
    collateral: o.contracts > 1 ? `${o.collateral} per contract` : o.collateral,
    pop: Math.round(o.pop),
    nextEarning: o.earningsDate ? fmtDate(o.earningsDate, { month: 'short', day: 'numeric' }) : '—',
    dividend: o.exDividendDate ? `Ex ${fmtDate(o.exDividendDate, { month: 'short', day: 'numeric' })}` : '—',
    goalContribution: o.goalContributionPct,
    estimatedWeekly: o.weeklyContributionPct,
    premiumToEarn: o.totalPremium,
    maxRiskTotal: o.maxRisk == null ? null : o.maxRisk * o.contracts,
    breakevenText: twoSided ? `$${o.breakeven.toFixed(2)} – $${o.breakevenHigh.toFixed(2)}` : `$${o.breakeven.toFixed(2)}`,
    strategyText: o.contracts > 1 ? o.description.replace('1x', `${o.contracts}x`) : o.description,
    contractType: o.strategy,
    expirationText: `${fmtDate(o.expiry)} (${o.expiryDays} days)`,
    campaignId,
    campaignName,
    campaignTarget: target,
    earnedSoFar: earned,
    earnedPct,
    withThisTrade: withTrade,
    withThisTradePct: withPct,
    goalImprovementPct: target > 0 ? Math.round((o.totalPremium / target) * 1000) / 10 : 0,
    confidence: `${o.confidence} - ${o.confidencePct}%`,
    confidenceLabel: o.confidence,
    keyReasons: o.reasons || [],
    warnings: o.warnings || [],
    generatedAt,
    marketPhase,
  };
}

export async function fetchOpportunity(id) {
  return toDetails(await getJSON(`/api/opportunities/${encodeURIComponent(id)}`));
}
