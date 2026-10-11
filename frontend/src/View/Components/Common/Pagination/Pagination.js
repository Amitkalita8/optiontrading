import { ChevronIcon } from '../../Icons/FallbackIcons';
import './Pagination.css';

function Pagination({ page, totalPages, onChange }) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  return (
    <nav className="pagination" aria-label="Pagination">
      <button
        type="button"
        className="pagination__btn"
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
        aria-label="Previous page"
      >
        <ChevronIcon direction="left" />
      </button>
      {pages.map((p) => (
        <button
          key={p}
          type="button"
          className={`pagination__btn ${p === page ? 'pagination__btn--active' : ''}`}
          onClick={() => onChange(p)}
          aria-current={p === page ? 'page' : undefined}
        >
          {p}
        </button>
      ))}
      <button
        type="button"
        className="pagination__btn"
        disabled={page === totalPages}
        onClick={() => onChange(page + 1)}
        aria-label="Next page"
      >
        <ChevronIcon direction="right" />
      </button>
    </nav>
  );
}

export default Pagination;
