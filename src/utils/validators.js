/**
 * Validation utility functions.
 *
 * Pure functions that return true/false or throw ApiError.
 * Used by services and middleware to validate input before processing.
 */
import mongoose from "mongoose";
import ApiError from "./ApiError.js";

/**
 * Check whether a string is a valid email address.
 *
 * @param {string} email
 * @returns {boolean}
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Check whether a value is a valid MongoDB ObjectId.
 *
 * @param {string} id
 * @returns {boolean}
 */
export const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

/**
 * Alias for isValidObjectId — used in services for readability.
 */
export const validateObjectId = isValidObjectId;

/**
 * Validate that all required fields are present and non-empty.
 *
 * @param {object} body   - Request body to check.
 * @param {string[]} fields - Field names that must exist.
 * @throws {ApiError} 400 if any field is missing or empty.
 */
export const validateRequiredFields = (body, fields) => {
  const missing = fields.filter(
    (f) => body[f] === undefined || body[f] === null || body[f] === ""
  );

  if (missing.length > 0) {
    throw new ApiError(
      400,
      `Missing required fields: ${missing.join(", ")}`,
      missing.map((f) => ({ field: f, message: `${f} is required` }))
    );
  }
};

/**
 * Validate that a value is one of the allowed enum values.
 *
 * @param {string} value      - The value to check.
 * @param {string[]} allowed  - Permitted values.
 * @param {string} fieldName  - Name for the error message.
 * @throws {ApiError} 400 if the value is not in the allowed list.
 */
export const validateEnum = (value, allowed, fieldName) => {
  if (value !== undefined && !allowed.includes(value)) {
    throw new ApiError(
      400,
      `Invalid ${fieldName}. Allowed values: ${allowed.join(", ")}`,
      [{ field: fieldName, message: `Must be one of: ${allowed.join(", ")}` }]
    );
  }
};
