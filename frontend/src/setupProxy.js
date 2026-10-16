// Dev-server proxy (picked up automatically by react-scripts): forwards /api/*
// to the Go backend in ../backend, so the browser talks to one origin.
// Override the target with BACKEND_URL, e.g. BACKEND_URL=http://localhost:9000.
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function setupProxy(app) {
  const token = process.env.REACT_APP_API_TOKEN;
  const target = process.env.BACKEND_URL || 'http://localhost:8085';
  app.use(
    '/api',
    createProxyMiddleware({
      target,
      changeOrigin: true,
      onProxyReq: (proxyReq, req) => {
        if (token && !req.headers['authorization']) {
          proxyReq.setHeader('Authorization', `Bearer ${token}`);
        }
      },
    })
  );

  app.use(
    ['/phpmyadmin', '/db'],
    createProxyMiddleware({
      target,
      changeOrigin: true,
    })
  );
};
