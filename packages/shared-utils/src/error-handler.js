/**
 * shared-utils — src/error-handler.js
 * Express global error handler middleware
 */

function errorHandler(serviceName) {
  return (err, req, res, next) => {
    const correlationId = req.correlationId || '-';
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      service: serviceName,
      correlationId,
      message: err.message,
      stack: err.stack,
    }));
    res.status(err.status || 500).json({
      error: err.code || 'internal_error',
      message: err.message || 'Terjadi kesalahan server',
      correlationId,
    });
  };
}

module.exports = { errorHandler };
