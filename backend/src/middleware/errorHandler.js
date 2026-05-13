function errorHandler(err, req, res, _next) {
  const status  = err.status || err.statusCode || 500;
  const message = err.message || "Internal server error";

  if (process.env.NODE_ENV !== "production") {
    console.error(`[${req.method} ${req.path}]`, err);
  }

  res.status(status).json({ error: message });
}

module.exports = errorHandler;
