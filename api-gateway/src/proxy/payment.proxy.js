/**
 * api-gateway — proxy/payment.proxy.js
 * Forward request ke payment-service
 */
const { createProxyMiddleware } = require('http-proxy-middleware');

const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL || 'http://localhost:3003';

const paymentProxy = createProxyMiddleware({
  target: PAYMENT_SERVICE_URL,
  changeOrigin: true,
  on: {
    error: (err, req, res) => {
      console.error('[api-gateway] payment-service proxy error:', err.message);
      res.status(502).json({
        error: 'bad_gateway',
        message: 'payment-service tidak dapat dihubungi',
        correlationId: req.correlationId,
      });
    },
  },
  logger: console,
});

module.exports = paymentProxy;
