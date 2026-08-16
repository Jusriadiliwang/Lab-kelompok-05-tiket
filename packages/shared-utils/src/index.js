/**
 * shared-utils — src/index.js
 * Entry point package shared-utils
 */
const { createLogger }           = require('./logger');
const { correlationIdMiddleware } = require('./correlation-id');
const { errorHandler }           = require('./error-handler');

module.exports = { createLogger, correlationIdMiddleware, errorHandler };
