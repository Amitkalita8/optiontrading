import { newOpportunities } from '../../Data/mockData';
import { getCompany } from '../Companies/companyModel';
import { withLatency } from '../mockLatency';

export function fetchOpportunities() {
  return withLatency({ opportunities: newOpportunities });
}

export function fetchOpportunity(id) {
  const opp = newOpportunities.find((o) => o.id === id || o.symbol.toLowerCase() === id?.toLowerCase()) || newOpportunities[0];
  const company = getCompany(opp.symbol) || { name: `${opp.symbol} Corporation` };

  const isMsft = opp.symbol === 'MSFT';
  const currentPrice = opp.currentPrice || (isMsft ? 912.0 : 250.0);
  const strike = opp.strikePrice || (isMsft ? 920.0 : 260.0);
  const expiryDays = opp.expiryDays || 30;
  const premium = opp.premium || (isMsft ? 329.09 : 180.0);
  const buyingPower = isMsft ? 91200 : Math.round(strike * 100);
  const maxRisk = isMsft ? 6139 : Math.round(buyingPower * 0.08);
  const breakeven = isMsft ? 913.86 : Math.round((currentPrice - premium / 100) * 100) / 100;

  const expDate = new Date(Date.now() + expiryDays * 86400000);
  const expDateStr = isMsft ? 'July 31, 2026' : expDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const details = {
    ...opp,
    companyName: (company.name || `${opp.symbol} Corporation`).toUpperCase(),
    currentPrice,
    strike,
    buyingPower,
    delta: isMsft ? '+0.15' : '+0.18',
    theta: isMsft ? '-0.51' : '-0.42',
    pop: isMsft ? 82 : 79,
    nextEarning: isMsft ? 'July 30' : 'Aug 14',
    dividend: isMsft ? '$3.32/yr' : '$1.80/yr',
    goalContribution: isMsft ? 31 : 28,
    estimatedWeekly: isMsft ? 10 : 9,
    premiumToEarn: isMsft ? 1245 : Math.round(premium * 4),
    maxRisk,
    riskLevel: 'Moderate',
    breakeven,
    strategyText: `Sell 1x ${opp.symbol} $${strike}-Call`,
    contractType: opp.strategy,
    collateral: `100 ${opp.symbol} Shares (Already in portfolio)`,
    expirationText: `${expDateStr} (${expiryDays} days)`,
    weeklyTarget: 4167,
    earnedThisWeek: 2853.56,
    earnedThisWeekPct: 68,
    withThisTrade: 3250.28,
    withThisTradePct: 78,
    goalImprovementPct: 10,
    score: 97,
    confidence: 'High - 91%',
    keyReasons: [
      { title: 'Strong fit with your weekly target', desc: 'Contributes 10%' },
      { title: 'Risk is within your safe limits', desc: 'Uses 11% of your total capital' },
      { title: 'Favorable market conditions', desc: 'High IV, bullish trend' },
      { title: 'Better than alternatives', desc: 'Ranks #1 for OE opportunities' },
    ],
  };

  return withLatency(details);
}
