import express from "express";

import {
  getMyNotifications,
  markNotificationAsRead,
} from "../controllers/notification.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get(
  "/",
  authenticate,
  getMyNotifications
);

router.patch(
  "/:notificationId/read",
  authenticate,
  markNotificationAsRead
);

export default router;