// Static mock data used until the backend API is wired up.

export const campaignSummary = [
  { label: 'Total Campaigns', value: '03' },
  { label: 'Total Capital Allocated', value: '$1,225,000' },
  { label: 'Portfolio Yield', value: '3.81%' },
  { label: 'Premium Run Rate', value: '$18,420 / month' },
  { label: 'Total Earned So Far', value: '$46,657' },
];

export const campaigns = [
  {
    id: 'technology-2026',
    name: 'Technology campaign 2026',
    shortName: 'Technology campaign 2026',
    createdOn: 'Jan 01, 2026',
    capital: 1000000,
    consumed: 50,
    goal: 1200000,
    earned: 32179,
    progress: 7,
    progressNote: 'Day 54 of 180',
    earnedNote: '+15.2% since last month',
    status: 'On Track',
  },
  {
    id: 'banking-sector',
    name: 'Banking sector',
    shortName: 'Banking sector',
    createdOn: 'Dec 15, 2025',
    capital: 150000,
    consumed: 80,
    goal: 200000,
    earned: 9348,
    progress: 62,
    progressNote: 'Day 31 of 90',
    earnedNote: '-1.2% since last month',
    status: 'Behind',
  },
  {
    id: 'healthcare-opportunity',
    name: 'Healthcare opportunity',
    shortName: 'Healthcare opportunity',
    createdOn: 'Oct 10, 2025',
    capital: 75000,
    consumed: 100,
    goal: 100000,
    earned: 50130,
    progress: 100,
    progressNote: 'Completed on time',
    earnedNote: '',
    status: 'Completed',
  },
];

export const activeCampaign = {
  name: 'Technology campaign 2026',
  stats: [
    { label: 'Capital Allocated', value: '$1,000,000' },
    { label: 'Target Goal', value: '20%' },
    { label: 'Campaign Target', value: '$1,200,000' },
    { label: 'Monthly Target', value: '$16,667' },
    { label: 'Weekly Target', value: '$3,333.4' },
    { label: 'Earned So Far', value: '$32,179', highlight: true },
  ],
  startDate: 'JAN 01, 2026',
  endDate: 'DEC 31, 2026',
  timelineProgress: 82,
  currentDay: 54,
  aheadBy: '$49',
};

export const opportunityTabs = ['Recommended', 'Upcoming Expiry', 'High IV'];

export const opportunities = {
  Recommended: [
    {
      id: 1,
      title: 'AAPL • Covered Call • Sell 1 × $920 Call',
      tags: [
        { label: '1 DTE', tone: 'orange' },
        { label: 'Mid IV', tone: 'orange' },
        { label: 'High POP', tone: 'green' },
      ],
      risk: 'Defined Risk',
      metrics: [
        { label: 'Expected Premium', value: '$980.65', note: 'per lot' },
        { label: 'Max Risk', value: '$1,258', note: '1.0% of portfolio' },
        { label: 'Risk Level', value: 'Moderate' },
        { label: 'Breakeven', value: '$980.65' },
        { label: 'POP', value: '78%' },
      ],
    },
    {
      id: 2,
      title: 'MSFT • Cash Secured Put • Sell 1 × $410 Put',
      tags: [
        { label: '7 DTE', tone: 'orange' },
        { label: 'Low IV', tone: 'green' },
        { label: 'High POP', tone: 'green' },
      ],
      risk: 'Defined Risk',
      metrics: [
        { label: 'Expected Premium', value: '$412.30', note: 'per lot' },
        { label: 'Max Risk', value: '$2,140', note: '1.7% of portfolio' },
        { label: 'Risk Level', value: 'Low' },
        { label: 'Breakeven', value: '$405.88' },
        { label: 'POP', value: '82%' },
      ],
    },
    {
      id: 3,
      title: 'NVDA • Iron Condor • 1 × 118/122/138/142',
      tags: [
        { label: '14 DTE', tone: 'orange' },
        { label: 'High IV', tone: 'orange' },
        { label: 'Mid POP', tone: 'green' },
      ],
      risk: 'Defined Risk',
      metrics: [
        { label: 'Expected Premium', value: '$146.00', note: 'per lot' },
        { label: 'Max Risk', value: '$254', note: '0.2% of portfolio' },
        { label: 'Risk Level', value: 'Moderate' },
        { label: 'Breakeven', value: '$120.54' },
        { label: 'POP', value: '64%' },
      ],
    },
  ],
  'Upcoming Expiry': [],
  'High IV': [],
};

export const stockInsights = [
  {
    ticker: 'AAPL',
    name: 'Apple Inc.',
    exchange: 'NASDAQ',
    ivRank: '68%',
    expectedMove: '±$4.82',
    price: '$165.02',
    change: '+3.4',
    timestamp: '23 Sep, 19:59',
    series: [
      2, 30, 48, 18, 10, 14, 36, 34, 22, 12, 26, 32, 17, 16, 27, 24, 29, 18, 27, 21,
      28, 20, 17, 19, 15, 26, 19, 11, 16, 22, 20, 12, 14, 26, 19, 30, 21, 13, 21, 24,
      29, 19, 26, 21, 24, 20, 23, 17, 13, 16, 19, 11, 14, 22, 15,
    ],
  },
  {
    ticker: 'MSFT',
    name: 'Microsoft Corp.',
    exchange: 'NASDAQ',
    ivRank: '41%',
    expectedMove: '±$6.10',
    price: '$418.36',
    change: '-1.2',
    timestamp: '23 Sep, 19:59',
    series: [
      22, 24, 21, 26, 28, 25, 30, 27, 29, 26, 24, 27, 31, 33, 30, 28, 32, 35, 33, 30,
      29, 27, 30, 32, 34, 31, 29, 28, 26, 27, 25, 28, 30, 29, 27, 26, 24, 25, 23, 24,
    ],
  },
];

export const positionsSummary = [
  { label: 'Open Positions', value: '06' },
  { label: 'Total Premium Collected', value: '$48,250' },
  { label: 'UNREALIZED P&L', value: '+$4,820' },
  { label: 'Margin Used', value: '$58,205' },
];

export const watchlist = [
  { ticker: 'META', color: '#0866ff' },
  { ticker: 'AAPL', color: '#111111' },
  { ticker: 'MSFT', color: '#f25022' },
  { ticker: 'GOOGL', color: '#4285f4' },
  { ticker: 'AMZN', color: '#ff9900' },
  { ticker: 'NVDA', color: '#76b900' },
  { ticker: 'TSLA', color: '#cc0000' },
  { ticker: 'AMD', color: '#1b1b1b' },
];

// Opportunities page. `tone` colours the symbol badge; `abbr` overrides its two letters.
export const newOpportunities = [
  { id: 'msft-cc', symbol: 'MSFT', tone: 'gray', strategy: 'Covered Call', currentPrice: 912, strikePrice: 920, expiryDays: 30, premium: 329.09, annualizedYield: 1.8 },
  { id: 'nvda-sp', symbol: 'NVDA', tone: 'green', strategy: 'Secure Put', currentPrice: 245.6, strikePrice: 250, expiryDays: 15, premium: 189.39, annualizedYield: 3.4 },
  { id: 'meta-ic', symbol: 'META', tone: 'blue', strategy: 'Iron Condor', currentPrice: 350, strikePrice: 400, expiryDays: 60, premium: 495.27, annualizedYield: 21.0 },
  { id: 'amzn-bcs', symbol: 'AMZN', tone: 'amber', strategy: 'Bull Call Spread', currentPrice: 178.4, strikePrice: 200.5, expiryDays: 45, premium: 131.39, annualizedYield: 7.5 },
  { id: 'aapl-bps', symbol: 'AAPL', abbr: 'AP', tone: 'gray', strategy: 'Bear Put Spread', currentPrice: 189.32, strikePrice: 200, expiryDays: 90, premium: 50.57, annualizedYield: 13.5 },
  { id: 'googl-straddle', symbol: 'GOOGL', tone: 'red', strategy: 'Straddle', currentPrice: 142.18, strikePrice: 200.5, expiryDays: 120, premium: 49.04, annualizedYield: 20.6 },
  { id: 'tsla-strangle', symbol: 'TSLA', tone: 'red', strategy: 'Strangle', currentPrice: 248.96, strikePrice: 250, expiryDays: 75, premium: 284.57, annualizedYield: 27.2 },
  { id: 'avgo-butterfly', symbol: 'AVGO', tone: 'gray', strategy: 'Butterfly Spread', currentPrice: 1284.5, strikePrice: 1350.5, expiryDays: 10, premium: 328.52, annualizedYield: 1.5 },
  { id: 'nflx-calendar', symbol: 'NFLX', tone: 'red', strategy: 'Calendar Spread', currentPrice: 623.18, strikePrice: 650, expiryDays: 5, premium: 54.49, annualizedYield: 25.5 },
  { id: 'amd-collar', symbol: 'AMD', tone: 'green', strategy: 'Collar Strategy', currentPrice: 155.67, strikePrice: 200, expiryDays: 25, premium: 219.11, annualizedYield: 5.1 },
  { id: 'jpm-cc', symbol: 'JPM', tone: 'blue', strategy: 'Covered Call', currentPrice: 198.42, strikePrice: 205, expiryDays: 21, premium: 142.8, annualizedYield: 9.2 },
  { id: 'crm-csp', symbol: 'CRM', tone: 'amber', strategy: 'Cash Secured Put', currentPrice: 272.15, strikePrice: 265, expiryDays: 35, premium: 176.4, annualizedYield: 6.8 },
];

// Company directory used by watchlists and the company search.
// goalFit: strong | moderate | weak. `opportunityId` links "View opportunity" to an
// entry in newOpportunities; companies without one show "Monitoring".
export const companies = [
  { ticker: 'MSFT', name: 'Microsoft Corporation', tone: 'gray', price: 912.67, change: -0.6, goalFit: 'weak', opportunityId: 'msft-cc' },
  { ticker: 'NVDA', name: 'NVIDIA Corporation', tone: 'green', price: 1245.3, change: 1.78, goalFit: 'strong', opportunityId: 'nvda-sp' },
  { ticker: 'META', name: 'Meta Platforms, Inc.', tone: 'blue', price: 3078.54, change: 2.1, goalFit: 'moderate', opportunityId: 'meta-ic' },
  { ticker: 'AMZN', name: 'Amazon.com, Inc.', tone: 'amber', price: 687.19, change: 0.95, goalFit: 'strong' },
  { ticker: 'AAPL', name: 'Apple Inc.', abbr: 'AP', tone: 'gray', price: 2451.88, change: -0.28, goalFit: 'moderate', opportunityId: 'aapl-bps' },
  { ticker: 'GOOGL', name: 'Alphabet Inc.', tone: 'red', price: 5320.42, change: 1.32, goalFit: 'strong' },
  { ticker: 'TSLA', name: 'Tesla, Inc.', tone: 'red', price: 1893.76, change: 2.46, goalFit: 'moderate', opportunityId: 'tsla-strangle' },
  { ticker: 'AVGO', name: 'Broadcom Inc.', tone: 'gray', price: 4167.05, change: 1.12, goalFit: 'moderate', opportunityId: 'avgo-butterfly' },
  { ticker: 'AMD', name: 'Advanced Micro Devices, Inc.', tone: 'green', price: 155.67, change: -1.04, goalFit: 'moderate', opportunityId: 'amd-collar' },
  { ticker: 'NFLX', name: 'Netflix, Inc.', tone: 'red', price: 623.18, change: 0.41, goalFit: 'weak', opportunityId: 'nflx-calendar' },
  { ticker: 'PLTR', name: 'Palantir Technologies Inc.', tone: 'blue', price: 24.86, change: 3.12, goalFit: 'strong' },
  { ticker: 'CRM', name: 'Salesforce, Inc.', tone: 'amber', price: 272.15, change: -0.35, goalFit: 'moderate', opportunityId: 'crm-csp' },
  { ticker: 'JPM', name: 'JPMorgan Chase & Co.', tone: 'blue', price: 198.42, change: 0.52, goalFit: 'strong', opportunityId: 'jpm-cc' },
  { ticker: 'BAC', name: 'Bank of America Corporation', tone: 'red', price: 35.18, change: -0.22, goalFit: 'moderate' },
  { ticker: 'WFC', name: 'Wells Fargo & Company', tone: 'red', price: 57.64, change: 0.18, goalFit: 'weak' },
  { ticker: 'C', name: 'Citigroup Inc.', tone: 'blue', price: 62.3, change: 0.71, goalFit: 'moderate' },
  { ticker: 'MS', name: 'Morgan Stanley', tone: 'gray', price: 96.45, change: -0.47, goalFit: 'weak' },
  { ticker: 'GS', name: 'The Goldman Sachs Group, Inc.', tone: 'blue', price: 458.12, change: 0.93, goalFit: 'strong' },
  { ticker: 'USB', name: 'U.S. Bancorp', tone: 'red', price: 44.07, change: 0.12, goalFit: 'weak' },
  { ticker: 'PNC', name: 'PNC Financial Services Group', tone: 'amber', price: 158.9, change: -0.31, goalFit: 'moderate' },
  { ticker: 'UNH', name: 'UnitedHealth Group Inc.', tone: 'blue', price: 521.66, change: 0.64, goalFit: 'strong' },
  { ticker: 'JNJ', name: 'Johnson & Johnson', tone: 'red', price: 155.21, change: -0.12, goalFit: 'moderate' },
  { ticker: 'LLY', name: 'Eli Lilly and Company', tone: 'red', price: 782.4, change: 1.87, goalFit: 'strong' },
  { ticker: 'PFE', name: 'Pfizer Inc.', tone: 'blue', price: 28.73, change: -0.58, goalFit: 'weak' },
  { ticker: 'ABBV', name: 'AbbVie Inc.', tone: 'blue', price: 171.35, change: 0.44, goalFit: 'moderate' },
  { ticker: 'MRK', name: 'Merck & Co., Inc.', tone: 'green', price: 126.8, change: 0.29, goalFit: 'moderate' },
  { ticker: 'CVS', name: 'CVS Health Corporation', tone: 'red', price: 57.92, change: -1.1, goalFit: 'weak' },
  { ticker: 'AMGN', name: 'Amgen Inc.', tone: 'blue', price: 301.45, change: 0.76, goalFit: 'moderate' },
  { ticker: 'TMO', name: 'Thermo Fisher Scientific Inc.', tone: 'gray', price: 574.3, change: 0.33, goalFit: 'moderate' },
  { ticker: 'ABT', name: 'Abbott Laboratories', tone: 'gray', price: 112.64, change: -0.19, goalFit: 'weak' },
];

export const watchlists = [
  { id: 'tech-2026', name: 'Technology campaign 2026', tickers: ['MSFT', 'NVDA', 'META', 'AMZN', 'AAPL', 'GOOGL', 'TSLA', 'AVGO'] },
  { id: 'banking', name: 'Banking sector', tickers: ['BAC', 'WFC', 'C', 'JPM', 'MS', 'GS', 'USB', 'PNC'] },
  { id: 'healthcare', name: 'Healthcare Opportunities', tickers: ['UNH', 'JNJ', 'LLY', 'PFE', 'ABBV', 'MRK', 'CVS', 'AMGN', 'TMO', 'ABT'] },
  { id: 'core', name: 'Core opportunities', tickers: ['MSFT', 'NVDA', 'AAPL', 'AMZN', 'GOOGL', 'META', 'TSLA', 'AMD', 'PLTR', 'JPM', 'CRM', 'NFLX'] },
  { id: 'testing', name: 'New watchlist - testing', tickers: ['MSFT', 'NVDA', 'AAPL', 'AMZN', 'GOOGL', 'META'] },
];

export const systemStatus = {
  model: 'OptionsAlpha-v4.2',
  latency: '18ms',
  feedNote: 'Real-time feed provided for active campaign execution',
};
