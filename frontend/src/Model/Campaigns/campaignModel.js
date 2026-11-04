import { deleteJSON, getJSON, patchJSON, postJSON, putJSON } from '../../Utils/api';
import { formatCurrency } from '../../Utils/format';

// Campaigns come from the backend with computed metrics (targets, day N of
// total, ahead/behind plan) and a health: on_track | behind | paused |
// completed | upcoming.

export const HEALTH_LABELS = {
  on_track: 'On Track',
  behind: 'Behind',
  paused: 'Paused',
  completed: 'Completed',
  upcoming: 'Upcoming',
};

const createdFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
const pct = (n) => `${Math.round(n * 10) / 10}%`;

function progressNote(m) {
  if (m.phase === 'upcoming') return 'Not started yet';
  if (m.phase === 'ended') return 'Ended';
  return m.totalDays ? `Day ${m.dayNumber} of ${m.totalDays}` : '';
}

function planNote(c, m) {
  if (m.phase !== 'running' || c.status === 'paused') return '';
  const amount = formatCurrency(Math.abs(m.aheadBy));
  return m.aheadBy >= 0 ? `${amount} ahead of plan` : `${amount} behind plan`;
}

// Backend campaign -> what the table and charts show.
export function resolveCampaign(c) {
  const m = c.metrics ?? {};
  const progress = m.netTarget > 0 ? Math.min(100, Math.round((c.earned / m.netTarget) * 100)) : 0;
  return {
    ...c,
    id: String(c.id),
    createdOn: c.createdAt ? createdFormat.format(new Date(c.createdAt)) : '',
    capitalNote: `${pct(m.targetReturnPct ?? 0)} target return`,
    goalNote: m.monthlyTarget ? `${formatCurrency(m.monthlyTarget)} / month` : 'Monthly target',
    progress,
    progressNote: progressNote(m),
    earnedNote: planNote(c, m),
    health: c.health ?? 'on_track',
    statusLabel: HEALTH_LABELS[c.health] ?? 'On Track',
  };
}

const formatSummary = (s = {}) => [
  { label: 'Total Campaigns', value: String(s.total || 0).padStart(2, '0') },
  { label: 'Total Capital Allocated', value: formatCurrency(s.totalCapital || 0) },
  { label: 'Portfolio Yield', value: `${(s.portfolioYieldPct || 0).toFixed(2)}%` },
  { label: 'Premium Run Rate', value: `${formatCurrency(s.premiumRunRate || 0)} / month` },
  { label: 'Total Earned So Far', value: formatCurrency(s.totalEarned || 0) },
];

export async function fetchCampaigns() {
  const data = await getJSON('/api/campaigns');
  return {
    campaigns: (data.campaigns || []).map(resolveCampaign),
    campaignSummary: formatSummary(data.summary),
  };
}

export const fetchCampaign = async (id) => resolveCampaign(await getJSON(`/api/campaigns/${id}`));

export const createCampaign = (input) => postJSON('/api/campaigns', input);
export const updateCampaign = (id, input) => putJSON(`/api/campaigns/${id}`, input);
export const deleteCampaign = (id) => deleteJSON(`/api/campaigns/${id}`);
export const duplicateCampaign = (id) => postJSON(`/api/campaigns/${id}/duplicate`);
// status: 'paused' | 'active' (resume) | 'completed'
export const setCampaignStatus = (id, status) => patchJSON(`/api/campaigns/${id}/settings`, { status });
export const linkWatchlist = (id, watchlistId) => patchJSON(`/api/campaigns/${id}/settings`, { watchlistId: Number(watchlistId) });
