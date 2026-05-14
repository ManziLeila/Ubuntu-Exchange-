const logger = require('../utils/logger');

/**
 * Attach X-Request-Id to every request.
 * Downstream services should forward this header.
 */
function requestId(req, res, next) {
  const id = req.headers['x-request-id'] || require('uuid').v4();
  req.requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
}

/**
 * Structured request/response logger.
 */
function httpLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    logger.info({
      type: 'http',
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: Date.now() - start,
      requestId: req.requestId,
      userId: req.user?.id,
    });
  });
  next();
}

/**
 * Global error handler.
 */
function errorHandler(err, req, res, next) {
  logger.error({
    msg: err.message,
    stack: err.stack,
    requestId: req.requestId,
  });

  if (err.name === 'ZodError') {
    return res.status(400).json({ error: 'Validation error', details: err.errors });
  }

  const status = err.status || 500;
  res.status(status).json({
    error: status === 500 ? 'Internal server error' : err.message,
  });
}

module.exports = { requestId, httpLogger, errorHandler };
