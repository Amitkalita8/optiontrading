import Card from '../../Common/Card/Card';
import Skeleton from '../../Common/Skeleton/Skeleton';
import '../../Common/Skeleton/PageSkeleton.css';
import './CompanyPicker.css';

// Placeholder for the "Add Companies" card: label, search line, company rows.
function CompanyPickerSkeleton({ rows = 5 }) {
  return (
    <Card className="company-picker">
      <Skeleton width={130} height={16} />
      <Skeleton height={40} radius={4} />
      <div className="company-picker__list">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="skeleton-company-row">
            <Skeleton width={52} height={52} radius="50%" />
            <div className="page-skeleton__stack" style={{ flex: 1 }}>
              <Skeleton width={70} height={17} />
              <Skeleton width="45%" height={15} />
            </div>
            <Skeleton width={70} height={34} />
            <Skeleton width={24} height={24} radius={6} />
          </div>
        ))}
      </div>
    </Card>
  );
}

export default CompanyPickerSkeleton;
