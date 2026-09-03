/**
 * Custom API error class for consistent error handling across the application.
 *
 * Extends the native Error to include an HTTP status code and an array of
 * detailed error objects (useful for validation errors). Errors marked as
 * "operational" are safe to show to clients; non-operational errors
 * (programming bugs) should only be logged internally.
 */
class ApiError extends Error {
  /**
   * @param {number}  statusCode  - HTTP status code (e.g. 400, 401, 404).
   * @param {string}  message     - Human-readable error message.
   * @param {Array}   errors      - Optional list of detailed error objects.
   * @param {boolean} isOperational - Whether this is an expected operational error.
   */
  constructor(
    statusCode,
    message = "Something went wrong",
    errors = [],
    isOperational = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = isOperational;
    this.success = false;

    // Maintain proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export default ApiError;
