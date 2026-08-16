/**
 * api-gateway — proxy/ticket.proxy.js
 * Forward request ke ticket-service
 */
const { createProxyMiddleware } = require('http-proxy-middleware');

const TICKET_SERVICE_URL = process.env.TICKET_SERVICE_URL || 'http://localhost:3002';

const ticketProxy = createProxyMiddleware({
  target: TICKET_SERVICE_URL,
  changeOrigin: true,
  on: {
    error: (err, req, res) => {
      console.error('[api-gateway] ticket-service proxy error:', err.message);
      res.status(502).json({
        error: 'bad_gateway',
        message: 'ticket-service tidak dapat dihubungi',
        correlationId: req.correlationId,
      });
    },
  },
  logger: console,
});

module.exports = ticketProxy;
