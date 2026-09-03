/**
 * Notification controller.
 *
 * Exposes HTTP endpoints for the in-app notification system:
 *   - GET    /                       → getMyNotifications
 *   - PATCH  /:notificationId/read   → markNotificationAsRead
 *
 * Delegates all business logic to the notification service layer.
 */
import {
  getMyNotifications as getMyNotificationsService,
  markAsRead,
} from "../services/notification.service.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";

/**
 * GET /api/notifications
 *
 * Fetch all notifications for the authenticated user, newest first.
 * Requires authentication (any role).
 */
export const getMyNotifications = asyncHandler(async (req, res) => {
  const notifications = await getMyNotificationsService(req.user.userId);

  return ApiResponse.success(
    res,
    notifications,
    "Notifications fetched successfully"
  );
});

/**
 * PATCH /api/notifications/:notificationId/read
 *
 * Mark a single notification as read.
 * The notification must belong to the authenticated user.
 */
export const markNotificationAsRead = asyncHandler(async (req, res) => {
  const notification = await markAsRead(
    req.params.notificationId,
    req.user.userId
  );

  return ApiResponse.success(
    res,
    notification,
    "Notification marked as read"
  );
});
