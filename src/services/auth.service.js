/**
 * Authentication service.
 *
 * Handles user registration and login logic including password hashing,
 * duplicate-email checks, and JWT generation. All configuration values
 * (secret, env) are read from the centralised config module.
 */
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import ApiError from "../utils/ApiError.js";
import { generateToken } from "../utils/jwt.js";
import {
  isValidEmail,
  validateRequiredFields,
  validateEnum,
} from "../utils/validators.js";

const SALT_ROUNDS = 10;

/**
 * Register a new user.
 *
 * @param {object}  param0
 * @param {string}  param0.name     - Display name (2-100 chars).
 * @param {string}  param0.email    - Unique email address.
 * @param {string}  param0.password - Minimum 6 characters (will be hashed).
 * @param {string}  param0.role     - "MANAGER" or "ENGINEER".
 * @returns {object} Safe user subset (id, name, email, role).
 * @throws {ApiError} 400 if validation fails, 409 if email already exists.
 */
export const registerUser = async ({ name, email, password, role }) => {
  // --- Input validation ---
  validateRequiredFields({ name, email, password, role }, [
    "name",
    "email",
    "password",
    "role",
  ]);

  if (!isValidEmail(email)) {
    throw new ApiError(400, "Invalid email format");
  }

  if (password.length < 6) {
    throw new ApiError(400, "Password must be at least 6 characters");
  }

  validateEnum(role, ["MANAGER", "ENGINEER"], "role");

  // --- Check for duplicate email ---
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    throw new ApiError(409, "User with this email already exists");
  }

  // --- Create user ---
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    role,
  });

  // Return a safe subset (never expose the password hash)
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
};

/**
 * Authenticate an existing user and return a signed JWT.
 *
 * @param {object} param0
 * @param {string} param0.email
 * @param {string} param0.password
 * @returns {{ token: string, user: object }} JWT string and safe user subset.
 * @throws {ApiError} 401 if credentials are invalid.
 */
export const loginUser = async ({ email, password }) => {
  validateRequiredFields({ email, password }, ["email", "password"]);

  // Fetch user with password field (excluded by default in schema)
  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    throw new ApiError(401, "Invalid email or password");
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid email or password");
  }

  // Sign JWT with user id and role
  const token = generateToken({
    userId: user._id,
    role: user.role,
  });

  return {
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
};
