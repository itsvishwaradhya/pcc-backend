/**
 * Higher-order wrapper for async Express route handlers.
 *
 * Eliminates repetitive try/catch blocks in every controller by catching
 * any rejected promise and forwarding the error to Express's error-handling
 * middleware (the one with four parameters: err, req, res, next).
 *
 * Usage:
 *   router.get("/some-route", asyncHandler(async (req, res) => { ... }));
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
