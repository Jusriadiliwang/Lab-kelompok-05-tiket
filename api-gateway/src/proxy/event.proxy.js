/**
 * api-gateway — proxy/event.proxy.js
 * Forward request ke event-service
 */
const { createProxyMiddleware } = require('http-proxy-middleware');

const EVENT_SERVICE_URL = process.env.EVENT_SERVICE_URL || 'http://localhost:3001';

const eventProxy = createProxyMiddleware({
  target: EVENT_SERVICE_URL,
  changeOrigin: true,
  on: {
    error: (err, req, res) => {
      console.error('[api-gateway] event-service proxy error:', err.message);
      res.status(502).json({
        error: 'bad_gateway',
        message: 'event-service tidak dapat dihubungi',
        correlationId: req.correlationId,
      });
    },
  },
  logger: console,
});

module.exports = eventProxy;
