import Card from '../../Common/Card/Card';
import SectionHeader from '../../Common/SectionHeader/SectionHeader';
import StatsStrip from '../../Common/StatsStrip/StatsStrip';
import positionsIcon from '../../../Assets/Image/Light/Existing positions - nav bar - collapsed.png';
import './PositionsSummary.css';

function PositionsSummary({ stats }) {
  return (
    <Card className="positions-summary">
      <SectionHeader
        icon={<img src={positionsIcon} alt="" />}
        title="Existing Positions"
        linkLabel="View Positions"
        linkTo="/positions"
      />
      <StatsStrip stats={stats} size="md" className="positions-summary__stats" />
    </Card>
  );
}

export default PositionsSummary;
