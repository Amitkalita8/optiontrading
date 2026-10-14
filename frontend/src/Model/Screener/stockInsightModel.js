import { postJSON } from '../../Utils/api';

// AI stock screener: the Go backend computes live metrics and asks Groq to
// rate the stock for option sellers (good / medium / poor).
export const askStockInsight = ({ symbol, question = '' }) =>
  postJSON('/api/screener/ask', { symbol: symbol.trim().toUpperCase(), question: question.trim() });

export const MAX_QUESTION_LENGTH = 300;

export const SUGGESTED_TICKERS = ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'META', 'TSLA'];

export const SUGGESTED_QUESTIONS = [
  'Is it a good time to sell cash-secured puts?',
  'Good for covered calls this month?',
  'How risky is it for option selling right now?',
  'Which strike range looks safer for the next 30–45 days?',
];

export const RATING_LABELS = {
  good: { label: 'Good', hint: 'Favourable for selling premium now' },
  medium: { label: 'Medium', hint: 'Usable with caution' },
  poor: { label: 'Poor', hint: 'Unfavourable right now' },
};
