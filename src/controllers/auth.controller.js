/**
 * Authentication controller.
 *
 * Handles user registration, login (JWT cookie), and logout.
 */
import { registerUser, loginUser } from "../services/auth.service.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import config from "../config/config.js";

/**
 * POST /api/auth/register
 *
 * @body {string} name     - User's display name.
 * @body {string} email    - Unique email address.
 * @body {string} password - Minimum 6 characters.
 * @body {string} role     - "MANAGER" or "ENGINEER".
 */
export const register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  const user = await registerUser({ name, email, password, role });

  return ApiResponse.success(res, user, "User registered successfully", 201);
});

/**
 * POST /api/auth/login
 *
 * Sets an httpOnly cookie containing the signed JWT.
 *
 * @body {string} email
 * @body {string} password
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const { token, user } = await loginUser({ email, password });

  // Set the JWT as an httpOnly cookie (not accessible via JS)
  res.cookie("token", token, {
    httpOnly: true,
    secure: config.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 24 * 60 * 60 * 1000, // 1 day
  });

  return ApiResponse.success(res, user, "Login successful");
});

/**
 * POST /api/auth/logout
 *
 * Clears the JWT cookie.
 */
export const logout = asyncHandler(async (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: config.NODE_ENV === "production",
    sameSite: "strict",
  });

  return ApiResponse.success(res, null, "Logout successful");
});
