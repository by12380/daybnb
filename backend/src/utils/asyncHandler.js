/**
 * Wraps an async Express route handler so that rejected promises
 * are automatically forwarded to the error-handling middleware.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
