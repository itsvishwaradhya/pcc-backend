/**
 * Global error-handling middleware.
 *
 * Catches all errors thrown or passed via next(err) in the application.
 * If the error is an ApiError it returns the associated status code and
 * structured response; otherwise it returns a generic 500.
 */
import ApiError from "../utils/ApiError.js";

export const errorMiddleware = (error, req, res, next) => {
  // Log the full error internally for debugging
  console.error("[Error]", error);

  // If it's one of our known operational errors, use its statusCode
  if (error instanceof ApiError) {
    return res.status(error.statusCode).json({
      success: false,
      statusCode: error.statusCode,
      message: error.message,
      errors: error.errors,
      data: null,
    });
  }

  // Mongoose validation error
  if (error.name === "ValidationError") {
    const errors = Object.values(error.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return res.status(400).json({
      success: false,
      statusCode: 400,
      message: "Validation error",
      errors,
      data: null,
    });
  }

  // Mongoose duplicate key error
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    return res.status(409).json({
      success: false,
      statusCode: 409,
      message: `Duplicate value for ${field}`,
      errors: [{ field, message: `${field} already exists` }],
      data: null,
    });
  }

  // Unexpected / programming errors - return generic message
  return res.status(500).json({
    success: false,
    statusCode: 500,
    message: "Internal server error",
    errors: [],
    data: null,
  });
};
