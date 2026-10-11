import { campaigns, campaignSummary } from '../../Data/mockData';
import { withLatency } from '../mockLatency';

// TODO: replace with a call to the backend campaigns endpoint.
export function fetchCampaigns() {
  return withLatency({ campaigns, campaignSummary });
}
