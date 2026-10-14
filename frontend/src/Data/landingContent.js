// Copy for the public landing page, kept here so sections stay presentational.

export const hero = {
  eyebrow: 'For option sellers',
  title: 'A research desk for selling options on your own terms',
  subtitle:
    'Set out how you like to trade — capital, strategies, strikes, duration and risk — and Option Seller finds, ' +
    'explains and tracks the option-selling opportunities that fit. Your strategy, our market intelligence.',
  points: ['Built around your trading approach', 'Explains why every opportunity fits', 'Watches positions after you trade'],
};

// Worked example from the product brief (short call). Premium is illustrative.
export const optionSelling = {
  title: 'What is option selling?',
  intro:
    'An option seller (or writer) receives a premium by selling an option contract. In return they take on an ' +
    'obligation — so the real work is choosing what to sell, at which strike, for how long, and how to manage ' +
    'the position if the market moves against them.',
  example: {
    stock: 1000,
    strike: 1100,
    premium: 20,
    currency: '₹',
    story:
      'A trader expects a stock at ₹1,000 to stay at or below that level for the next few weeks, so they sell a ' +
      '₹1,100 Call and collect the premium.',
    outcomes: [
      { tone: 'good', title: 'Stock stays below ₹1,100', text: 'The option can expire worthless and the seller keeps the premium.' },
      { tone: 'risk', title: 'Stock rallies above the strike', text: 'The position turns against the seller — losses grow the further the price rises.' },
    ],
  },
  challenges: ['What to sell', 'Which strike', 'How long to hold', 'How to manage if the market moves'],
};

// Overall flow: Create Campaign → … → Trade Log, grouped into three phases.
export const workflow = [
  {
    phase: 'Set up',
    summary: 'Tell the platform how you trade.',
    steps: [
      { title: 'Create a campaign', text: 'Capital, goal and timeframe for this trading plan.' },
      { title: 'Define your trading approach', text: 'Strategies, strike selection, holding period, outlook and risk.' },
      { title: 'Select a watchlist', text: 'The stocks you actually want to trade.' },
    ],
  },
  {
    phase: 'Discover',
    summary: 'Let the AI screen the market with your rules.',
    formula: ['Approach', 'Watchlist', 'AI Screener'],
    steps: [
      { title: 'Find opportunities', text: 'The AI screener filters the market against your approach and watchlist.' },
      { title: 'Evaluate each opportunity', text: 'See why it was identified: stock conditions, option characteristics, premium and yield, risks.' },
    ],
  },
  {
    phase: 'Manage',
    summary: 'Stay on top of what you trade.',
    steps: [
      { title: 'Take the trade', text: 'You decide — and place it with your broker.' },
      { title: 'Monitor & manage', text: 'Get flagged when something changes enough to need attention.' },
      { title: 'Trade log', text: 'Every position and its outcome, in one record.' },
    ],
  },
];

// The five parts of the product. `icon` keys map to nav icons in ProductPillars.
export const pillars = [
  {
    icon: 'campaign',
    title: 'Campaign',
    text: 'Your overall trading setup and preferences — it tells the system what kind of opportunities you are looking for.',
    to: '/campaigns',
  },
  {
    icon: 'watchlist',
    title: 'Watchlist',
    text: 'Pick the stocks you care about. Analysis and opportunities focus on them.',
    to: '/watchlist',
  },
  {
    icon: 'screener',
    title: 'AI Screener',
    text: 'Combines your campaign, approach and watchlist to filter the market — e.g. “Put-selling candidates for a neutral-to-bullish view, 30–45 days, lower risk.”',
    to: '/trade-approaches',
  },
  {
    icon: 'opportunities',
    title: 'Opportunities',
    text: 'Potential trades that match your criteria, each with the reasons it was identified and the risks to weigh.',
    to: '/opportunities',
  },
  {
    icon: 'tradeLog',
    title: 'Trade Log & Positions',
    text: 'Track trades you take, see when a position needs attention, and keep a record of every outcome.',
    to: '/trade-log',
  },
];

// Campaign inputs that drive discovery.
export const campaignInputs = [
  { label: 'Capital available', hint: 'How much you can commit' },
  { label: 'Trading goal', hint: 'Target return for the campaign' },
  { label: 'Strategies', hint: 'Covered calls, cash-secured puts, spreads…' },
  { label: 'Moneyness / strikes', hint: 'ITM, ATM or OTM preference' },
  { label: 'Holding duration', hint: 'e.g. 30–45 days' },
  { label: 'Market outlook', hint: 'Bullish, neutral or bearish' },
  { label: 'Risk level', hint: 'Lower, moderate or aggressive' },
  { label: 'Position management', hint: 'Take-profit, stop-loss, rolls' },
  { label: 'Watchlist', hint: 'The stocks you want to trade' },
];

export const principle = {
  title: 'Decision support — not trade tips',
  subtitle:
    'We are not here to tell you “sell this option.” Option Seller gives you a structured workflow where your own ' +
    'strategy drives discovery, and the platform supplies the market intelligence and analysis around it.',
  not: ['“Sell this option” calls with no context', 'Black-box signals you cannot question', 'One-size-fits-all ideas'],
  instead: [
    'Opportunities filtered by your own rules',
    'A clear explanation of why each one was identified',
    'Risk factors surfaced before you trade',
    'Alerts when a position needs your attention',
  ],
};

export const disclaimer =
  'Option Seller is a research and decision-support tool. It does not give investment advice or place trades. ' +
  'Options involve significant risk — a seller can lose more than the premium received. Market data may be delayed ' +
  'and examples are illustrative.';
