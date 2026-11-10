import useOpportunities from "../../../Controller/useOpportunities";
import Card from "../../Components/Common/Card/Card";
import OpportunitiesTable from "../../Components/Opportunities/OpportunitiesTable/OpportunitiesTable";
import { OpportunityNotice } from "../../Components/Opportunities/OpportunityStatus/OpportunityStatus";
import OpportunitiesSkeleton from "./OpportunitiesSkeleton";

// Engine 01's full ranked list for the user's active campaign.
function OpportunitiesPage() {
  const { scan, status, error, refresh, refreshing, reload } =
    useOpportunities();

  if (status === "loading" && !scan) return <OpportunitiesSkeleton />;
  if (error && !scan) {
    return (
      <Card className="opps-table">
        <h1 className="card__title">New Opportunities</h1>
        <OpportunityNotice error={error} onRetry={reload} />
      </Card>
    );
  }
  return (
    <OpportunitiesTable
      scan={scan}
      opportunities={scan.opportunities}
      onRefresh={refresh}
      refreshing={refreshing}
    />
  );
}

export default OpportunitiesPage;
