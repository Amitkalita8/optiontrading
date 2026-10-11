// Dev-server proxy (picked up automatically by react-scripts): forwards /api/*
// to the Go backend in ../backend, so the browser talks to one origin.
// Override the target with BACKEND_URL, e.g. BACKEND_URL=http://localhost:9000.
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function setupProxy(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: process.env.BACKEND_URL || 'http://localhost:8085',
      changeOrigin: true,
    })
  );
};
