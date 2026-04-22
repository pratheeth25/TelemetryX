'use strict';

/**
 * Global error-handling middleware.
 * Must be registered LAST in Express (after all routes).
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Avoid leaking stack traces in production
  const body = {
    error: true,
    status,
    message,
  };

  if (process.env.NODE_ENV !== 'production') {
    body.stack = err.stack;
  }

  console.error(`[ErrorHandler] ${status} – ${message}`);

  res.status(status).json(body);
}

module.exports = errorHandler;
