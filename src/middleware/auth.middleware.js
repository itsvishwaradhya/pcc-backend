/**
 * Authentication middleware.
 *
 * Reads the JWT from the httpOnly cookie, verifies it, and attaches
 * the decoded payload ({ userId, role }) to req.user for downstream
 * middleware and controllers.
 */
import { verifyToken } from "../utils/jwt.js";

export const authenticate = (req, res, next) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        statusCode: 401,
        message: "Authentication required",
      });
    }

    // Verify the token and extract the payload
    const decoded = verifyToken(token);

    // Attach user info to the request for downstream handlers
    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      statusCode: 401,
      message: "Invalid or expired token",
    });
  }
};
