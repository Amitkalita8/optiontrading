import { useRef } from 'react';
import WatchlistCard from '../WatchlistCard/WatchlistCard';
import './WatchlistStrip.css';

const DRAG_THRESHOLD = 5;

// Horizontally scrolling row of watchlist cards. The scrollbar is hidden, so
// mouse users can drag the row; trackpads, touch, shift+wheel and keyboard focus
// scroll it natively.
function WatchlistStrip({ watchlists, selectedId, onSelect }) {
  const ref = useRef(null);
  const drag = useRef(null);

  const onPointerDown = (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    drag.current = { x: e.clientX, left: ref.current.scrollLeft, moved: false, id: e.pointerId };
  };

  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) < DRAG_THRESHOLD) return;
    if (!d.moved) {
      d.moved = true;
      ref.current.setPointerCapture(d.id);
      ref.current.classList.add('watchlist-strip--dragging');
    }
    ref.current.scrollLeft = d.left - dx;
  };

  const endDrag = () => {
    if (drag.current?.moved) ref.current.classList.remove('watchlist-strip--dragging');
    // Keep `moved` until the click that follows pointerup has been swallowed.
    setTimeout(() => {
      drag.current = null;
    });
  };

  // A drag shouldn't also count as clicking (selecting) a card.
  const onClickCapture = (e) => {
    if (drag.current?.moved) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  return (
    <div
      ref={ref}
      className="watchlist-strip"
      role="list"
      aria-label="Your watchlists"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onClickCapture={onClickCapture}
    >
      {watchlists.map((w) => (
        <div key={w.id} role="listitem" className="watchlist-strip__item">
          <WatchlistCard watchlist={w} selected={w.id === selectedId} onSelect={onSelect} />
        </div>
      ))}
    </div>
  );
}

export default WatchlistStrip;
