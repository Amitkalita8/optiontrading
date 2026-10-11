// Simulated network delay for mock-backed models, so loading states behave
// as they will against the real API. Remove once models call the backend.
export const MOCK_LATENCY_MS = 900;

export const withLatency = (data) =>
  new Promise((resolve) => {
    setTimeout(() => resolve(data), MOCK_LATENCY_MS);
  });
