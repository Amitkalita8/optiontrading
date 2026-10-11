import Skeleton from '../../Common/Skeleton/Skeleton';
import '../../Common/Skeleton/PageSkeleton.css';
import './FlowPage.css';

// Placeholder for a FlowPage screen (create watchlist / add company / approach
// editor) while its code or data loads. The title is static, so it's shown as
// real text; `intro` adds the heading + toggle row; `children` fills the body.
function FlowPageSkeleton({ title, intro = true, children }) {
  return (
    <div className="flow-page" aria-busy="true" aria-label={`Loading ${title}`}>
      <header className="flow-page__band">
        <h1>{title}</h1>
      </header>

      <div className="flow-page__body">
        {intro && (
          <div className="page-skeleton__row page-skeleton__row--between page-skeleton__row--wrap">
            <div className="page-skeleton__stack">
              <Skeleton width={300} height={34} />
              <Skeleton width={380} height={16} />
            </div>
            <Skeleton width={360} height={50} radius={10} />
          </div>
        )}

        {children}

        <div className="flow-page__actions">
          <Skeleton width={150} height={18} />
          <Skeleton width={150} height={58} radius={10} />
        </div>
      </div>

      <footer className="flow-page__status">
        <Skeleton width={260} height={13} />
        <Skeleton width={320} height={13} />
      </footer>
    </div>
  );
}

export default FlowPageSkeleton;
