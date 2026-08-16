/**
 * api-gateway — middleware/correlation-id.middleware.js
 * Inject X-Correlation-ID ke setiap request untuk distributed tracing
 */
const { v4: uuidv4 } = require('uuid');

function correlationIdMiddleware(req, res, next) {
  const correlationId = req.headers['x-correlation-id'] || uuidv4();
  req.correlationId = correlationId;
  req.headers['x-correlation-id'] = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);
  next();
}

module.exports = { correlationIdMiddleware };
