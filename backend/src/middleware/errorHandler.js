const ApiError = require("../utils/ApiError");

/**
 * Global Express error handler.
 * Catches ApiError instances and unexpected errors alike
 * and returns a consistent JSON shape.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, _req, res, _next) {
  // Known operational error
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      error: err.message,
    });
  }

  // Unexpected / programmer error – log full details server-side
  console.error("Unhandled error:", err);

  const statusCode = err.statusCode || 500;
  const message =
    process.env.NODE_ENV === "production"
      ? "Internal server error"
      : err.message || "Internal server error";

  return res.status(statusCode).json({ error: message });
}

module.exports = errorHandler;
