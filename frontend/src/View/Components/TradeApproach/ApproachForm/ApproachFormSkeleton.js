import Card from '../../Common/Card/Card';
import Skeleton from '../../Common/Skeleton/Skeleton';
import '../../Common/Skeleton/PageSkeleton.css';
import '../FormSection/FormSection.css';

// A labelled field placeholder: label line + control block.
function Field({ wide, height = 52, className = '' }) {
  return (
    <div className={`page-skeleton__stack ${wide ? 'span-2' : ''} ${className}`}>
      <Skeleton width={160} height={15} />
      <Skeleton height={height} radius={10} />
    </div>
  );
}

// One FormSection-shaped card: tinted header band + field grid.
function SectionSkeleton({ children }) {
  return (
    <Card className="form-section">
      <Skeleton height={56} radius={10} />
      <div className="skeleton-form-grid">{children}</div>
    </Card>
  );
}

// Placeholder for ApproachForm (Discovery Preferences + Position Management).
function ApproachFormSkeleton() {
  return (
    <>
      <SectionSkeleton>
        <div className="page-skeleton__stack span-2">
          <Skeleton width={170} height={15} />
          <div className="page-skeleton__row page-skeleton__row--wrap" style={{ gap: 12 }}>
            {[130, 170, 150, 160, 130, 100].map((w) => (
              <Skeleton key={w} width={w} height={42} radius={6} />
            ))}
          </div>
        </div>
        <Field />
        <Field />
        <Field height={44} />
        <Field />
      </SectionSkeleton>

      <SectionSkeleton>
        <Field />
        <Field />
        <Field wide height={44} />
        <Skeleton width={420} height={16} className="span-2" />
      </SectionSkeleton>
    </>
  );
}

export default ApproachFormSkeleton;
