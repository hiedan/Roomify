const { ZodError } = require('zod');
const AppError = require('../utils/AppError');

function sendError(res, status, code, message) {
  return res.status(status).json({ success: false, error: { code, message } });
}

/** Runs after all routes: any unmatched request becomes a 404 error. */
function notFound(req, _res, next) {
  next(new AppError(404, 'NOT_FOUND', `Route ${req.method} ${req.originalUrl} not found`));
}

// Express recognizes error handlers by their 4 parameters, so keep `_next`.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, _req, res, _next) {
  if (err instanceof ZodError) {
    const message = err.issues.map((i) => `${i.path.join('.') || 'input'}: ${i.message}`).join('; ');
    return sendError(res, 400, 'VALIDATION_ERROR', message);
  }
  if (err.type === 'entity.parse.failed') {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Request body is not valid JSON');
  }
  if (err instanceof AppError) {
    return sendError(res, err.status, err.code, err.message);
  }
  // eslint-disable-next-line no-console
  console.error(err);
  return sendError(res, 500, 'INTERNAL', 'Internal server error');
}

module.exports = { notFound, errorHandler };
