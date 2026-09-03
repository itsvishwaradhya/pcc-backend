/**
 * Notification routes.
 *
 *   - GET    /                       → list user's notifications
 *   - PATCH  /:notificationId/read   → mark notification as read
 */
import express from "express";

import {
  getMyNotifications,
  markNotificationAsRead,
} from "../controllers/notification.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";
import { validateObjectIdParam } from "../middleware/validate.js";

const router = express.Router();

// --- Any authenticated user: list own notifications ---
router.get(
  "/",
  authenticate,
  getMyNotifications
);

// --- Any authenticated user: mark a notification as read ---
router.patch(
  "/:notificationId/read",
  authenticate,
  validateObjectIdParam("notificationId"),
  markNotificationAsRead
);

export default router;
