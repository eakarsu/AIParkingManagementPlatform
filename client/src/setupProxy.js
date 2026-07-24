const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function setupProxy(app) {
  const target = (process.env.REACT_APP_API_BASE || 'http://127.0.0.1:3001/api').replace(/\/api\/?$/, '');
  app.use('/api', createProxyMiddleware({ target, changeOrigin: true }));
};
