import { getJSON, postJSON, putJSON, deleteJSON } from '../../Utils/api';
import { formatCurrency } from '../../Utils/format';

const statusMap = {
  'on track': 'On Track',
  'active': 'On Track',
  'behind': 'Behind',
  'paused': 'Behind',
  'completed': 'Completed',
};

const resolveCampaign = (c) => {
  const status = statusMap[c.status?.toLowerCase()] || 'On Track';
  const progress = c.goal > 0 ? Math.min(100, Math.round((c.earned / c.goal) * 100)) : 0;
  const createdDate = c.createdAt ? new Date(c.createdAt) : new Date(c.startDate || Date.now());
  const createdOn = createdDate.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });

  return {
    ...c,
    id: String(c.id),
    shortName: c.name,
    createdOn,
    consumed: 50,
    progress,
    progressNote: `${progress}% of goal`,
    earnedNote: `${formatCurrency(c.earned)} earned`,
    status,
  };
};

const formatSummary = (s) => [
  { label: 'Total Campaigns', value: String(s?.total || 0).padStart(2, '0') },
  { label: 'Total Capital Allocated', value: formatCurrency(s?.totalCapital || 0) },
  { label: 'Portfolio Yield', value: `${(s?.portfolioYieldPct || 0).toFixed(2)}%` },
  { label: 'Total Goal', value: formatCurrency(s?.totalGoal || 0) },
  { label: 'Total Earned So Far', value: formatCurrency(s?.totalEarned || 0) },
];

export async function fetchCampaigns() {
  const data = await getJSON('/api/campaigns');
  return {
    campaigns: (data.campaigns || []).map(resolveCampaign),
    campaignSummary: formatSummary(data.summary),
  };
}

export const fetchCampaign = async (id) => {
  const c = await getJSON(`/api/campaigns/${id}`);
  return resolveCampaign(c);
};

export const createCampaign = (input) => postJSON('/api/campaigns', input);
export const updateCampaign = (id, input) => putJSON(`/api/campaigns/${id}`, input);
export const deleteCampaign = (id) => deleteJSON(`/api/campaigns/${id}`);
