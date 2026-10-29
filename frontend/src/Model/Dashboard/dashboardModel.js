import { getJSON, patchJSON, putJSON } from '../../Utils/api';

// Dashboard data comes from the backend (GET /api/dashboard): the campaign
// switcher list, the active campaign with computed metrics, and its linked
// watchlist and approach.

// campaignId: optional; without it the backend uses the remembered campaign.
export const fetchDashboard = (campaignId) =>
  getJSON(campaignId ? `/api/dashboard?campaignId=${encodeURIComponent(campaignId)}` : '/api/dashboard');

// Remember the user's choice for next time.
export const setActiveCampaign = (campaignId) => putJSON('/api/dashboard/active', { campaignId: Number(campaignId) });

// Partial update of a campaign's links and approach settings:
// { approachId?, watchlistId?, marketOutlook?, strategies?, moneyness?, holdingDuration?, risk? }.
// Setting approachId copies that approach's values into the campaign.
export const setCampaignSettings = (campaignId, settings) => patchJSON(`/api/campaigns/${campaignId}/settings`, settings);

// "54th"
export function ordinal(n) {
  const v = n % 100;
  const suffix = v >= 11 && v <= 13 ? 'th' : { 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th';
  return `${n}${suffix}`;
}
