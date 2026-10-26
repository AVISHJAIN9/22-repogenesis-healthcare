function notFoundHandler(req, res) {
  return res.status(404).json({ success: false, error: 'Resource not found' });
}

function errorHandler(err, req, res, next) {
  const status = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  const sanitized = {
    success: false,
    error: message,
    ...(process.env.NODE_ENV !== 'production' ? { stack: err.stack } : {})
  };
  return res.status(status).json(sanitized);
}

module.exports = { notFoundHandler, errorHandler };
