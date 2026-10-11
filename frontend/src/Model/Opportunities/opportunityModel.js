import { newOpportunities } from '../../Data/mockData';
import { withLatency } from '../mockLatency';

// TODO: replace with a call to the backend opportunities endpoint.
export function fetchOpportunities() {
  return withLatency({ opportunities: newOpportunities });
}
