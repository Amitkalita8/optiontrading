// Comprehensive Trade Log & Trade Report dataset matching Figma design

export const tradeStats = [
  { label: 'Total Trades', value: '06' },
  { label: 'Net P&L', value: '$23,860', highlight: true },
  { label: 'Win Rate (Excl. BE)', value: '71.4%' },
  { label: 'Avg. Win', value: '$2,347' },
  { label: 'Avg. Loss', value: '$1,128' },
  { label: 'Accumulated Return', value: '-$1,098' },
  { label: 'Profit Factor', value: '1.86' },
];

export const strategyPerformanceData = [
  { name: 'Bull-Put Spread', pl: 16000, formatted: '+$16K', type: 'profit', heightPct: 100 },
  { name: 'Long Call', pl: 13400, formatted: '+$13.4K', type: 'profit', heightPct: 84 },
  { name: 'Cash-Secured Put', pl: 7800, formatted: '+$7.8K', type: 'profit', heightPct: 49 },
  { name: 'Strangle', pl: -3200, formatted: '-$3.2K', type: 'loss', heightPct: 20 },
  { name: 'Covered Call', pl: -4500, formatted: '-$4.5K', type: 'loss', heightPct: 28 },
  { name: 'Bull-Call Spread', pl: -6300, formatted: '-$6.3K', type: 'loss', heightPct: 39 },
];

export const tradeHistory = [
  {
    id: 'msft-1',
    symbol: 'MSFT',
    companyName: 'Microsoft Corporation',
    tradeDetail: 'Sold 1 × $920 Call',
    date: 'July 31, 2026',
    strategy: 'Covered Call',
    pl: 1200,
    plFormatted: '+$1,200',
    result: 'Win',
    rMultiple: '+1.32R',
    duration: '2h 25m',
    entryPrice: '$12.40',
    exitPrice: '$233.12',
    chartData: {
      symbol: 'MSFT',
      date: 'Aug 21, 2026',
      entryPrice: '$230.43',
      stopLoss: '$229.23',
      exitPrice: '$233.12',
      candles: [
        { time: '09:30', open: 228.8, high: 229.4, low: 228.5, close: 229.2, type: 'up' },
        { time: '09:35', open: 229.2, high: 229.8, low: 229.0, close: 229.6, type: 'up' },
        { time: '09:40', open: 229.6, high: 230.5, low: 229.5, close: 230.43, type: 'up', marker: 'entry' },
        { time: '09:45', open: 230.43, high: 231.2, low: 230.1, close: 230.8, type: 'up' },
        { time: '09:50', open: 230.8, high: 231.0, low: 230.2, close: 230.4, type: 'down' },
        { time: '09:55', open: 230.4, high: 230.7, low: 229.8, close: 230.0, type: 'down' },
        { time: '10:00', open: 230.0, high: 230.3, low: 229.23, close: 229.5, type: 'down', marker: 'stop' },
        { time: '10:05', open: 229.5, high: 230.6, low: 229.4, close: 230.5, type: 'up' },
        { time: '10:10', open: 230.5, high: 231.8, low: 230.4, close: 231.6, type: 'up' },
        { time: '10:15', open: 231.6, high: 232.4, low: 231.3, close: 232.1, type: 'up' },
        { time: '10:20', open: 232.1, high: 233.5, low: 232.0, close: 233.12, type: 'up', marker: 'exit' },
        { time: '10:25', open: 233.12, high: 233.6, low: 232.8, close: 233.2, type: 'up' },
        { time: '10:30', open: 233.2, high: 233.4, low: 232.6, close: 232.9, type: 'down' },
      ],
    },
    lotSize: '02',
    aiConfidence: '82% - High',
    riskAssessment: {
      planNetRisk: '$1,000 (1.00%)',
      actualRisk: '$80 (0.08%)',
      planNetReward: '$1,600 (1.60%)',
      actualReward: '$1,320 (1.32%)',
      rMultipleVal: '1.32R',
      rMultipleNote: 'This trade risked 0.08% to make 1.32%.',
    },
    tradeDiagnosis: [
      {
        tag: 'Opportunity',
        tone: 'green',
        title: 'Held profit too short',
        desc: 'Price moved further in your favor after exit. Potential +$420 more.',
      },
      {
        tag: 'Monitor',
        tone: 'amber',
        title: 'Excess risk',
        desc: 'Risk was within limit, but slightly above your average.',
      },
      {
        tag: 'Improve',
        tone: 'red',
        title: 'Exit timing',
        desc: 'Exited before any major move. Consider trailing stop or partial exit.',
      },
      {
        tag: 'Strength',
        tone: 'green',
        title: 'Rule adherence',
        desc: 'Great job! You followed the right plan and avoided emotional decisions.',
      },
    ],
    actionPlan: {
      weeklyProgress: { target: 5000, current: 2840, pct: 56 },
      campaignProgress: { target: 1200000, current: 32179, pct: 3 },
      weeklyAdvice: 'Focus on improving exit timing using RSI signal.',
      keyTakeaway: 'Let winners run and trust your plan. Patience = Profit.',
    },
    tradeThesis: {
      strategy: 'Covered Call',
      detail: 'Sell 1 × $920 Call',
      aiConfidence: '82% - High',
      criteria: [
        'Price above resistance',
        'Volume Spike',
        'RSI above 50',
        'No major news/events',
        'Entry confirmation',
      ],
      banner: 'All criteria met. Trade followed the plan.',
    },
    performanceBenchmark: {
      avgWin: '+$1,650',
      thisTrade: '+$1,320',
      winRateSetup: '65%',
      overallWinRate: '48%',
    },
  },
  {
    id: 'googl-1',
    symbol: 'GOOGL',
    companyName: 'Alphabet Inc.',
    tradeDetail: 'Sold 2 × $185 Put',
    date: 'August 21, 2026',
    strategy: 'Cash-Secured Put',
    pl: -2110,
    plFormatted: '-$2,110',
    result: 'Loss',
    rMultiple: '-1.00R',
    duration: '5h 10m',
    entryPrice: '$8.50',
    exitPrice: '$180.20',
    chartData: {
      symbol: 'GOOGL',
      date: 'Aug 21, 2026',
      entryPrice: '$185.00',
      stopLoss: '$183.50',
      exitPrice: '$180.20',
      candles: [
        { time: '09:30', open: 186.2, high: 186.5, low: 185.8, close: 186.0, type: 'down' },
        { time: '09:45', open: 186.0, high: 186.2, low: 184.9, close: 185.0, type: 'down', marker: 'entry' },
        { time: '10:00', open: 185.0, high: 185.2, low: 183.5, close: 183.8, type: 'down', marker: 'stop' },
        { time: '10:30', open: 183.8, high: 184.0, low: 182.1, close: 182.4, type: 'down' },
        { time: '11:00', open: 182.4, high: 182.6, low: 180.2, close: 180.2, type: 'down', marker: 'exit' },
      ],
    },
    riskAssessment: {
      planNetRisk: '$1,500 (1.50%)',
      actualRisk: '$2,110 (2.11%)',
      planNetReward: '$1,200 (1.20%)',
      actualReward: '-$2,110 (-2.11%)',
      rMultipleVal: '-1.00R',
      rMultipleNote: 'Position exceeded maximum planned stop threshold.',
    },
    tradeDiagnosis: [
      {
        tag: 'Improve',
        tone: 'red',
        title: 'Stop loss execution',
        desc: 'Did not honor hard stop loss at $183.50, allowing losses to expand.',
      },
      {
        tag: 'Monitor',
        tone: 'amber',
        title: 'High beta underlying',
        desc: 'Market selloff accelerated tech put drawdown.',
      },
    ],
    actionPlan: {
      weeklyProgress: { target: 5000, current: 2840, pct: 56 },
      campaignProgress: { target: 1200000, current: 32179, pct: 3 },
      weeklyAdvice: 'Set automated GTC stop orders to prevent behavioral hesitation.',
    },
    tradeThesis: {
      strategy: 'Cash-Secured Put',
      detail: 'Sell 2 × $185 Put',
      criteria: [
        'Support hold at $185',
        'RSI above 40',
        'Earnings cleared',
      ],
      banner: 'Broken support criterion on 15m candle.',
    },
    performanceBenchmark: {
      avgWin: '+$1,650',
      thisTrade: '-$2,110',
      winRateSetup: '52%',
      overallWinRate: '61%',
    },
  },
  {
    id: 'tsla-1',
    symbol: 'TSLA',
    companyName: 'Tesla, Inc.',
    tradeDetail: 'Sold 1 × $190 Call',
    date: 'September 15, 2026',
    strategy: 'Covered Call',
    pl: 750,
    plFormatted: '+$750',
    result: 'Win',
    rMultiple: '+1.15R',
    duration: '1h 45m',
    entryPrice: '$5.60',
    exitPrice: '$188.40',
    chartData: {
      symbol: 'TSLA',
      date: 'Sept 15, 2026',
      entryPrice: '$192.10',
      stopLoss: '$195.00',
      exitPrice: '$188.40',
      candles: [
        { time: '09:30', open: 191.0, high: 192.5, low: 190.8, close: 192.1, type: 'up', marker: 'entry' },
        { time: '09:45', open: 192.1, high: 192.3, low: 190.5, close: 190.8, type: 'down' },
        { time: '10:00', open: 190.8, high: 191.0, low: 189.2, close: 189.5, type: 'down' },
        { time: '10:15', open: 189.5, high: 189.8, low: 188.4, close: 188.4, type: 'down', marker: 'exit' },
      ],
    },
    riskAssessment: {
      planNetRisk: '$800 (0.80%)',
      actualRisk: '$60 (0.06%)',
      planNetReward: '$900 (0.90%)',
      actualReward: '$750 (0.75%)',
      rMultipleVal: '1.15R',
      rMultipleNote: 'Captured 82% of max theoretical premium.',
    },
    tradeDiagnosis: [
      {
        tag: 'Opportunity',
        tone: 'green',
        title: 'Ideal execution',
        desc: 'Entered at local high, exited cleanly at predetermined profit target.',
      },
    ],
    actionPlan: {
      weeklyProgress: { target: 5000, current: 2840, pct: 56 },
      campaignProgress: { target: 1200000, current: 32179, pct: 3 },
      weeklyAdvice: 'Repeat this exact setup on high implied volatility earnings rolls.',
    },
    tradeThesis: {
      strategy: 'Covered Call',
      detail: 'Sell 1 × $190 Call',
      criteria: [
        'Resistance rejection',
        'Overbought RSI 72',
        'Low news risk',
      ],
      banner: 'All criteria met. Trade followed the plan.',
    },
    performanceBenchmark: {
      avgWin: '+$1,650',
      thisTrade: '+$750',
      winRateSetup: '70%',
      overallWinRate: '61%',
    },
  },
  {
    id: 'nvda-1',
    symbol: 'NVDA',
    companyName: 'NVIDIA Corporation',
    tradeDetail: 'Sold 3 × $1200 Put',
    date: 'October 30, 2026',
    strategy: 'Naked Put',
    pl: -3600,
    plFormatted: '-$3,600',
    result: 'Loss',
    rMultiple: '-1.85R',
    duration: '3d 4h',
    entryPrice: '$22.00',
    exitPrice: '$1165.00',
    chartData: {
      symbol: 'NVDA',
      date: 'Oct 30, 2026',
      entryPrice: '$1205.00',
      stopLoss: '$1190.00',
      exitPrice: '$1165.00',
      candles: [
        { time: 'Day 1', open: 1210, high: 1215, low: 1202, close: 1205, type: 'down', marker: 'entry' },
        { time: 'Day 2', open: 1205, high: 1206, low: 1188, close: 1190, type: 'down', marker: 'stop' },
        { time: 'Day 3', open: 1190, high: 1192, low: 1165, close: 1165, type: 'down', marker: 'exit' },
      ],
    },
    riskAssessment: {
      planNetRisk: '$2,000 (2.00%)',
      actualRisk: '$3,600 (3.60%)',
      planNetReward: '$2,500 (2.50%)',
      actualReward: '-$3,600 (-3.60%)',
      rMultipleVal: '-1.85R',
      rMultipleNote: 'Position sizing exceeded safe tier limits.',
    },
    tradeDiagnosis: [
      {
        tag: 'Improve',
        tone: 'red',
        title: 'Overleveraged contract sizing',
        desc: '3 naked put contracts committed 32% of total campaign buying power.',
      },
    ],
    actionPlan: {
      weeklyProgress: { target: 5000, current: 2840, pct: 56 },
      campaignProgress: { target: 1200000, current: 32179, pct: 3 },
      weeklyAdvice: 'Cap naked option positions at 10% maximum margin limit.',
    },
    tradeThesis: {
      strategy: 'Naked Put',
      detail: 'Sold 3 × $1200 Put',
      criteria: [
        'AI trend momentum',
        '20 EMA bounce',
      ],
      banner: 'Failed 20 EMA support. Stop overrun.',
    },
    performanceBenchmark: {
      avgWin: '+$1,650',
      thisTrade: '-$3,600',
      winRateSetup: '45%',
      overallWinRate: '61%',
    },
  },
  {
    id: 'aapl-1',
    symbol: 'AAPL',
    companyName: 'Apple Inc.',
    tradeDetail: 'Bought 2 × $215/$225 Call',
    date: 'October 05, 2026',
    strategy: 'Bull Call Spread',
    pl: 630,
    plFormatted: '+$630',
    result: 'Win',
    rMultiple: '+1.20R',
    duration: '4h 15m',
    entryPrice: '$3.40',
    exitPrice: '$221.80',
    chartData: {
      symbol: 'AAPL',
      date: 'Oct 05, 2026',
      entryPrice: '$216.50',
      stopLoss: '$214.80',
      exitPrice: '$221.80',
      candles: [
        { time: '09:30', open: 215.8, high: 216.6, low: 215.5, close: 216.5, type: 'up', marker: 'entry' },
        { time: '10:00', open: 216.5, high: 218.0, low: 216.3, close: 217.8, type: 'up' },
        { time: '11:00', open: 217.8, high: 220.2, low: 217.5, close: 219.9, type: 'up' },
        { time: '12:00', open: 219.9, high: 222.0, low: 219.5, close: 221.8, type: 'up', marker: 'exit' },
      ],
    },
    riskAssessment: {
      planNetRisk: '$680 (0.68%)',
      actualRisk: '$120 (0.12%)',
      planNetReward: '$800 (0.80%)',
      actualReward: '$630 (0.63%)',
      rMultipleVal: '1.20R',
      rMultipleNote: 'Solid risk-defined execution.',
    },
    tradeDiagnosis: [
      {
        tag: 'Opportunity',
        tone: 'green',
        title: 'Disciplined profit target',
        desc: 'Locked in 80% spread value without waiting for expiration gamma risk.',
      },
    ],
    actionPlan: {
      weeklyProgress: { target: 5000, current: 2840, pct: 56 },
      campaignProgress: { target: 1200000, current: 32179, pct: 3 },
      weeklyAdvice: 'Maintain vertical debit spreads during low IV environment.',
    },
    tradeThesis: {
      strategy: 'Bull Call Spread',
      detail: 'Bought 2 × $215/$225 Call',
      criteria: [
        'Breakout above $216',
        'Strong volume volume flow',
      ],
      banner: 'All criteria met. Trade followed the plan.',
    },
    performanceBenchmark: {
      avgWin: '+$1,650',
      thisTrade: '+$630',
      winRateSetup: '68%',
      overallWinRate: '61%',
    },
  },
  {
    id: 'amzn-1',
    symbol: 'AMZN',
    companyName: 'Amazon.com, Inc.',
    tradeDetail: 'Sold 1 × $195 Put',
    date: 'September 28, 2026',
    strategy: 'Cash-Secured Put',
    pl: 890,
    plFormatted: '+$890',
    result: 'Win',
    rMultiple: '+1.40R',
    duration: '6h 30m',
    entryPrice: '$4.80',
    exitPrice: '$198.50',
    chartData: {
      symbol: 'AMZN',
      date: 'Sept 28, 2026',
      entryPrice: '$196.20',
      stopLoss: '$194.00',
      exitPrice: '$198.50',
      candles: [
        { time: '09:30', open: 195.5, high: 196.5, low: 195.0, close: 196.2, type: 'up', marker: 'entry' },
        { time: '11:00', open: 196.2, high: 197.8, low: 196.0, close: 197.5, type: 'up' },
        { time: '13:00', open: 197.5, high: 199.0, low: 197.2, close: 198.5, type: 'up', marker: 'exit' },
      ],
    },
    riskAssessment: {
      planNetRisk: '$750 (0.75%)',
      actualRisk: '$90 (0.09%)',
      planNetReward: '$900 (0.90%)',
      actualReward: '$890 (0.89%)',
      rMultipleVal: '1.40R',
      rMultipleNote: 'High probability delta decay extraction.',
    },
    tradeDiagnosis: [
      {
        tag: 'Opportunity',
        tone: 'green',
        title: 'Strong underlying support',
        desc: 'Rebounded off 200 EMA support with high buyer volume.',
      },
    ],
    actionPlan: {
      weeklyProgress: { target: 5000, current: 2840, pct: 56 },
      campaignProgress: { target: 1200000, current: 32179, pct: 3 },
      weeklyAdvice: 'Cash-secured puts on mega-cap stocks generate consistent income.',
    },
    tradeThesis: {
      strategy: 'Cash-Secured Put',
      detail: 'Sold 1 × $195 Put',
      criteria: [
        'Support hold at $195',
        'Implied volatility rank 55',
      ],
      banner: 'All criteria met. Trade followed the plan.',
    },
    performanceBenchmark: {
      avgWin: '+$1,650',
      thisTrade: '+$890',
      winRateSetup: '66%',
      overallWinRate: '61%',
    },
  },
];

export const plOverTimeData = [
  { label: 'Jul 01', val: 15000, y: 75 },
  { label: 'Jul 07', val: 21000, y: 55 },
  { label: 'Jul 14', val: 18500, y: 65 },
  { label: 'Jul 21', val: 26000, y: 40 },
  { label: 'Jul 28', val: 21500, y: 53 },
  { label: 'Jul 31', val: 27860, y: 32 },
];

export const winRateTrendData = [
  { label: 'Jul 01', val: '60%', y: 70 },
  { label: 'Jul 07', val: '48%', y: 85 },
  { label: 'Jul 14', val: '62%', y: 68 },
  { label: 'Jul 21', val: '65%', y: 64 },
  { label: 'Jul 28', val: '75%', y: 50 },
  { label: 'Jul 31', val: '71.4%', y: 56 },
];

export const heatmapAugust2026 = [
  // Week 1 (Starts Sat Aug 1)
  { day: 1, type: 'profit', pl: '+$450', weekday: 'SAT' },
  { day: 2, type: 'none', pl: 'No trade', weekday: 'SUN' },
  // Week 2
  { day: 3, type: 'loss', pl: '-$120', weekday: 'MON' },
  { day: 4, type: 'profit', pl: '+$980', weekday: 'TUE' },
  { day: 5, type: 'profit', pl: '+$650', weekday: 'WED' },
  { day: 6, type: 'loss', pl: '-$85', weekday: 'THU' },
  { day: 7, type: 'profit', pl: '+$240', weekday: 'FRI' },
  { day: 8, type: 'none', pl: 'No trade', weekday: 'SAT' },
  { day: 9, type: 'none', pl: 'No trade', weekday: 'SUN' },
  // Week 3
  { day: 10, type: 'profit', pl: '+$175', weekday: 'MON' },
  { day: 11, type: 'loss', pl: '-$340', weekday: 'TUE' },
  { day: 12, type: 'profit', pl: '+$420', weekday: 'WED' },
  { day: 13, type: 'profit', pl: '+$690', weekday: 'THU' },
  { day: 14, type: 'loss', pl: '-$45', weekday: 'FRI' },
  { day: 15, type: 'none', pl: 'No trade', weekday: 'SAT' },
  { day: 16, type: 'none', pl: 'No trade', weekday: 'SUN' },
  // Week 4
  { day: 17, type: 'profit', pl: '+$520', weekday: 'MON' },
  { day: 18, type: 'profit', pl: '+$310', weekday: 'TUE' },
  { day: 19, type: 'loss', pl: '-$210', weekday: 'WED' },
  { day: 20, type: 'profit', pl: '+$145', weekday: 'THU' },
  { day: 21, type: 'loss', pl: '-$550', weekday: 'FRI' },
  { day: 22, type: 'none', pl: 'No trade', weekday: 'SAT' },
  { day: 23, type: 'none', pl: 'No trade', weekday: 'SUN' },
  // Week 5
  { day: 24, type: 'profit', pl: '+$440', weekday: 'MON' },
  { day: 25, type: 'loss', pl: '-$90', weekday: 'TUE' },
  { day: 26, type: 'profit', pl: '+$210', weekday: 'WED' },
  { day: 27, type: 'profit', pl: '+$410', weekday: 'THU' },
  { day: 28, type: 'loss', pl: '-$150', weekday: 'FRI' },
  { day: 29, type: 'none', pl: 'No trade', weekday: 'SAT' },
  { day: 30, type: 'none', pl: 'No trade', weekday: 'SUN' },
  // Week 6
  { day: 31, type: 'profit', pl: '+$340', weekday: 'MON' },
];

export const aiInsightsSummary = {
  subtitle: 'Your win rate is strong! Focus on managing losses in cash-secured puts.',
  items: [
    {
      title: 'Great job on Covered Calls',
      desc: "You've been consistently profitable with covered calls. Consider increasing positions size.",
    },
    {
      title: 'Watch Cash-Secured Puts',
      desc: 'Your losing trades in CSP are higher than your average win. Review strike selection.',
    },
    {
      title: 'Opportunity',
      desc: 'Consider rolling strategies earlier to lock in profits and reduce drawdown.',
    },
  ],
  improvementAreas: [
    { label: 'Risk Management', pct: 85, color: '#1f7a4d' },
    { label: 'Entry Timing', pct: 65, color: '#7cb342' },
    { label: 'Exit Management', pct: 70, color: '#f59e0b' },
  ],
};

export function getTradeLogEntry(idOrSymbol) {
  if (!idOrSymbol) return tradeHistory[0];
  const q = idOrSymbol.toLowerCase();
  return (
    tradeHistory.find(
      (t) => t.id.toLowerCase() === q || t.symbol.toLowerCase() === q
    ) || tradeHistory[0]
  );
}
