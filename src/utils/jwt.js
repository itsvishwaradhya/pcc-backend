/**
 * Centralised JWT utility.
 *
 * All token signing and verification goes through this module so that
 * the secret, algorithm, and expiry are defined in exactly one place
 * (config.js).
 */
import jwt from "jsonwebtoken";
import config from "../config/config.js";

/**
 * Sign a new JWT.
 *
 * @param {object} payload - Data to embed in the token (e.g. { userId, role }).
 * @returns {string} Signed JWT string.
 */
export const generateToken = (payload) => {
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: "1d",
  });
};

/**
 * Verify and decode a JWT.
 *
 * @param {string} token - The JWT string to verify.
 * @returns {object} Decoded payload.
 * @throws {Error} If the token is invalid or expired.
 */
export const verifyToken = (token) => {
  return jwt.verify(token, config.JWT_SECRET);
};
