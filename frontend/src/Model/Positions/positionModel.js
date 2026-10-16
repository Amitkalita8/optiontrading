import { deleteJSON, getJSON, postJSON, putJSON } from '../../Utils/api';

export async function fetchPositions() {
  const data = await getJSON('/api/positions');
  return data.positions || [];
}

export function createPosition(input) {
  return postJSON('/api/positions', input);
}

export function updatePosition(id, input) {
  return putJSON(`/api/positions/${id}`, input);
}

export function deletePosition(id) {
  return deleteJSON(`/api/positions/${id}`);
}

export function closePosition(id, currentVal) {
  return putJSON(`/api/positions/${id}`, {
    status: 'closed',
    currentValue: currentVal,
    closedAt: new Date().toISOString().split('T')[0],
  });
}
