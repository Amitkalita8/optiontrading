import {
  activeCampaign as defaultActiveCampaign,
  opportunities,
  opportunityTabs,
  positionsSummary,
  stockInsights,
  watchlist,
} from '../../Data/mockData';
import { fetchCampaigns } from '../Campaigns/campaignModel';
import { fetchWatchlists } from '../Watchlists/watchlistModel';

export async function fetchDashboard() {
  let userCampaign = defaultActiveCampaign;
  let userTickers = ['MSFT', 'AAPL', 'GOOGL', 'AMZN', 'NVDA'];
  let watchlistName = 'New watchlist - testing';

  try {
    const [campsRes, wlRes] = await Promise.allSettled([
      fetchCampaigns(),
      fetchWatchlists(),
    ]);

    if (campsRes.status === 'fulfilled' && campsRes.value?.campaigns?.length > 0) {
      const latest = campsRes.value.campaigns[0];
      const cap = latest.capital || 500000;
      const goal = latest.goal || 600000;
      const net = Math.max(0, goal - cap);
      const returnPct = cap > 0 ? ((net / cap) * 100).toFixed(0) : '20';
      const monthly = net / 12;
      const weekly = net / 52;

      userCampaign = {
        name: latest.name,
        stats: [
          { label: 'Capital Allocated', value: `$${cap.toLocaleString()}` },
          { label: 'Target Goal', value: `${returnPct}%` },
          { label: 'Campaign Target', value: `$${goal.toLocaleString()}` },
          { label: 'Monthly Target', value: `$${Math.round(monthly).toLocaleString()}` },
          { label: 'Weekly Target', value: `$${weekly.toFixed(1)}` },
          { label: 'Earned So Far', value: `$${(latest.earned || 0).toLocaleString()}`, highlight: true },
        ],
        startDate: latest.startDate || 'JAN 01, 2026',
        endDate: latest.endDate || 'DEC 31, 2026',
        timelineProgress: 15,
        currentDay: 1,
        aheadBy: '$0',
      };
    } else {
      // Check local storage fallback from onboarding
      const savedData = localStorage.getItem('active_campaign_data');
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          const cap = parsed.capital || 500000;
          const goal = parsed.goal || 600000;
          const net = parsed.netTarget || Math.max(0, goal - cap);
          const monthly = parsed.monthlyTarget || net / 12;
          const weekly = parsed.weeklyTarget || net / 52;
          userCampaign = {
            name: parsed.name,
            stats: [
              { label: 'Capital Allocated', value: `$${cap.toLocaleString()}` },
              { label: 'Target Goal', value: '20%' },
              { label: 'Campaign Target', value: `$${goal.toLocaleString()}` },
              { label: 'Monthly Target', value: `$${Math.round(monthly).toLocaleString()}` },
              { label: 'Weekly Target', value: `$${weekly.toFixed(1)}` },
              { label: 'Earned So Far', value: '$0', highlight: true },
            ],
            startDate: parsed.startDate || 'JAN 01, 2026',
            endDate: parsed.endDate || 'DEC 31, 2026',
            timelineProgress: 15,
            currentDay: 1,
            aheadBy: '$0',
          };
        } catch (e) {}
      }
    }

    if (wlRes.status === 'fulfilled' && wlRes.value?.watchlists?.length > 0) {
      const latestWl = wlRes.value.watchlists[0];
      if (latestWl.tickers && latestWl.tickers.length > 0) {
        userTickers = latestWl.tickers;
        watchlistName = latestWl.name || watchlistName;
      }
    } else {
      const savedTickers = localStorage.getItem('active_watchlist_tickers');
      if (savedTickers) {
        try {
          const parsed = JSON.parse(savedTickers);
          if (Array.isArray(parsed) && parsed.length > 0) userTickers = parsed;
        } catch (e) {}
      }
    }
  } catch (err) {
    console.warn('Dashboard fetch fallback:', err);
  }

  return {
    activeCampaign: userCampaign,
    userTickers,
    watchlistName,
    opportunities,
    opportunityTabs,
    positionsSummary,
    stockInsights,
    watchlist,
  };
}
