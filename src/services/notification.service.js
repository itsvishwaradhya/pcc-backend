/**
 * Notification service.
 *
 * Handles reading and updating in-app notifications for authenticated
 * users. Notifications are created by other services (e.g. approval
 * service) and consumed here.
 */
import Notification from "../models/Notification.js";
import ApiError from "../utils/ApiError.js";
import { validateObjectId } from "../utils/validators.js";

/**
 * Fetch all notifications for a user, newest first.
 *
 * @param {string} userId - ObjectId of the requesting user.
 * @returns {Notification[]} Array of notification documents (with task summary).
 */
export const getMyNotifications = async (userId) => {
  return Notification.find({ recipient: userId })
    .populate("task", "title status")
    .sort({ createdAt: -1 });
};

/**
 * Mark a single notification as read.
 *
 * Verifies the notification belongs to the requesting user before
 * updating.
 *
 * @param {string} notificationId - ObjectId of the notification.
 * @param {string} userId         - ObjectId of the requesting user.
 * @returns {Notification} Updated notification document.
 * @throws {ApiError} 404 if notification not found or doesn't belong to user.
 */
export const markAsRead = async (notificationId, userId) => {
  if (!validateObjectId(notificationId)) {
    throw new ApiError(400, "Invalid notification ID format");
  }

  const notification = await Notification.findOne({
    _id: notificationId,
    recipient: userId,
  });

  if (!notification) {
    throw new ApiError(404, "Notification not found");
  }

  notification.isRead = true;
  await notification.save();

  return notification;
};
