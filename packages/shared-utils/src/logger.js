/**
 * shared-utils — src/logger.js
 * Structured logger dengan correlation ID support
 */

function createLogger(serviceName) {
  function log(level, message, meta = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      service: serviceName,
      message,
      ...meta,
    };
    // eslint-disable-next-line no-console
    console[level === 'error' ? 'error' : 'log'](JSON.stringify(entry));
  }

  return {
    info:  (msg, meta) => log('info', msg, meta),
    warn:  (msg, meta) => log('warn', msg, meta),
    error: (msg, meta) => log('error', msg, meta),
    debug: (msg, meta) => log('debug', msg, meta),
  };
}

module.exports = { createLogger };
