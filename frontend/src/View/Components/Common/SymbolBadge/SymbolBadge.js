import './SymbolBadge.css';

// Two-letter ticker mark, e.g. "MS" for MSFT; `abbr` overrides it (AAPL -> "AP").
// tone: gray | green | blue | amber | red
function SymbolBadge({ symbol, abbr, tone = 'gray' }) {
  return (
    <span className={`symbol-badge symbol-badge--${tone}`} aria-hidden="true">
      {abbr ?? symbol.slice(0, 2)}
    </span>
  );
}

export default SymbolBadge;
