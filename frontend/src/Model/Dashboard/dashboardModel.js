import {
  activeCampaign,
  opportunities,
  opportunityTabs,
  positionsSummary,
  stockInsights,
  watchlist,
} from '../../Data/mockData';
import { withLatency } from '../mockLatency';

// TODO: replace with a call to the backend dashboard endpoint.
export function fetchDashboard() {
  return withLatency({
    activeCampaign,
    opportunities,
    opportunityTabs,
    positionsSummary,
    stockInsights,
    watchlist,
  });
}
