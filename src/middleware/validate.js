/**
 * Validation middleware factory.
 *
 * Provides reusable middleware for common validation patterns such as
 * checking that route parameters are valid MongoDB ObjectIds.
 */
import ApiError from "../utils/ApiError.js";
import { isValidObjectId } from "../utils/validators.js";

/**
 * Middleware that validates a route parameter is a valid ObjectId.
 *
 * @param {string} paramName - The route param to validate (e.g. "taskId").
 * @returns {Function} Express middleware.
 */
export const validateObjectIdParam = (paramName) => {
  return (req, res, next) => {
    const value = req.params[paramName];

    if (!value || !isValidObjectId(value)) {
      return next(new ApiError(400, `Invalid ${paramName} format`));
    }

    next();
  };
};
