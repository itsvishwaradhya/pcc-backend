/**
 * Authentication routes.
 *
 *   - POST /register → register a new user
 *   - POST /login    → authenticate and set JWT cookie
 *   - POST /logout   → clear JWT cookie
 */
import express from "express";

import {
  register,
  login,
  logout,
} from "../controllers/auth.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";

const router = express.Router();

// --- Public: register a new user ---
router.post("/register", register);

// --- Public: authenticate and receive JWT cookie ---
router.post("/login", login);

// --- Authenticated: clear JWT cookie ---
router.post("/logout", authenticate, logout);

export default router;
