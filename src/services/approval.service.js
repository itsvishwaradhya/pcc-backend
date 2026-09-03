/**
 * Approval workflow service.
 *
 * Manages the approve → acknowledge and reject → resubmit/acknowledge
 * portions of the task lifecycle. Each operation runs inside a MongoDB
 * transaction to guarantee atomicity of the state change, audit log,
 * notification, and mail outbox records.
 *
 * Operations:
 *   - approveTask:    SUBMITTED → APPROVED  (creates audit + notification + mail)
 *   - rejectTask:     SUBMITTED → REJECTED  (creates audit + notification + mail)
 *   - acknowledgeTask: APPROVED/REJECTED → RESOLVED (creates audit only)
 *   - resubmitTask:   REJECTED → IN_PROGRESS (creates audit only)
 */
import mongoose from "mongoose";

import Task from "../models/Task.js";
import AuditLog from "../models/AuditLog.js";
import Notification from "../models/Notification.js";
import MailOutbox from "../models/MailOutbox.js";
import ApiError from "../utils/ApiError.js";
import { validateObjectId } from "../utils/validators.js";

/**
 * Approve a submitted task (Manager action).
 *
 * Transitions the task from SUBMITTED to APPROVED and produces, in order:
 *   1. An audit entry recording the state change.
 *   2. An in-app notification for the assigned engineer.
 *   3. A mail outbox record representing a pending email.
 *
 * @param {string} taskId    - ObjectId of the task to approve.
 * @param {string} managerId - ObjectId of the manager performing the action.
 * @returns {Task} Updated task document.
 * @throws {ApiError} 404 if task not found, 400 if not in SUBMITTED state.
 */
export const approveTask = async (taskId, managerId) => {
  if (!validateObjectId(taskId)) {
    throw new ApiError(400, "Invalid task ID format");
  }

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const task = await Task.findOne({
      _id: taskId,
      manager: managerId,
    }).populate("engineer");

    if (!task) {
      throw new ApiError(404, "Task not found or not managed by you");
    }

    if (task.status !== "SUBMITTED") {
      throw new ApiError(
        400,
        `Only submitted tasks can be approved (current: ${task.status})`
      );
    }

    const beforeState = task.status;
    const afterState = "APPROVED";

    // --- State transition ---
    task.status = afterState;
    await task.save({ session });

    // 1. Audit entry
    await AuditLog.create(
      [
        {
          task: task._id,
          actor: managerId,
          action: "TASK_APPROVED",
          beforeState,
          afterState,
        },
      ],
      { session }
    );

    // 2. In-app notification for the engineer
    await Notification.create(
      [
        {
          recipient: task.engineer._id,
          task: task._id,
          type: "TASK_APPROVED",
          title: "Task approved",
          message: `Your task "${task.title}" has been approved.`,
        },
      ],
      { session }
    );

    // 3. Mail outbox record (simulated email)
    await MailOutbox.create(
      [
        {
          task: task._id,
          recipient: task.engineer.email,
          subject: `Task approved: ${task.title}`,
          body: `Your task "${task.title}" has been approved by the manager.`,
          deliveryState: "PENDING",
        },
      ],
      { session }
    );

    await session.commitTransaction();
    return task;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
};

/**
 * Reject a submitted task (Manager action).
 *
 * Transitions the task from SUBMITTED to REJECTED and produces:
 *   1. An audit entry (including the rejection reason in metadata).
 *   2. An in-app notification for the engineer.
 *   3. A mail outbox record.
 *
 * @param {string} taskId           - ObjectId of the task to reject.
 * @param {string} managerId        - ObjectId of the manager.
 * @param {string} rejectionReason  - Optional reason for rejection.
 * @returns {Task} Updated task document.
 * @throws {ApiError} 404 if not found, 400 if not in SUBMITTED state.
 */
export const rejectTask = async (taskId, managerId, rejectionReason) => {
  if (!validateObjectId(taskId)) {
    throw new ApiError(400, "Invalid task ID format");
  }

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const task = await Task.findOne({
      _id: taskId,
      manager: managerId,
    }).populate("engineer");

    if (!task) {
      throw new ApiError(404, "Task not found or not managed by you");
    }

    if (task.status !== "SUBMITTED") {
      throw new ApiError(
        400,
        `Only submitted tasks can be rejected (current: ${task.status})`
      );
    }

    const beforeState = task.status;
    const afterState = "REJECTED";

    // --- State transition ---
    task.status = afterState;
    await task.save({ session });

    // 1. Audit entry (stores rejection reason in metadata)
    await AuditLog.create(
      [
        {
          task: task._id,
          actor: managerId,
          action: "TASK_REJECTED",
          beforeState,
          afterState,
          metadata: { reason: rejectionReason || null },
        },
      ],
      { session }
    );

    // 2. In-app notification
    await Notification.create(
      [
        {
          recipient: task.engineer._id,
          task: task._id,
          type: "TASK_REJECTED",
          title: "Task rejected",
          message: rejectionReason
            ? `Your task "${task.title}" was rejected: ${rejectionReason}`
            : `Your task "${task.title}" was rejected.`,
        },
      ],
      { session }
    );

    // 3. Mail outbox record
    await MailOutbox.create(
      [
        {
          task: task._id,
          recipient: task.engineer.email,
          subject: `Task rejected: ${task.title}`,
          body: rejectionReason
            ? `Your task "${task.title}" was rejected. Reason: ${rejectionReason}`
            : `Your task "${task.title}" was rejected.`,
          deliveryState: "PENDING",
        },
      ],
      { session }
    );

    await session.commitTransaction();
    return task;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
};

/**
 * Acknowledge an approval or rejection (Engineer action).
 *
 * The engineer must explicitly acknowledge a decision before the task
 * is considered resolved. Transitions APPROVED/REJECTED → RESOLVED.
 * Produces an audit entry only (no notification or mail).
 *
 * @param {string} taskId     - ObjectId of the task.
 * @param {string} engineerId - ObjectId of the engineer.
 * @returns {Task} Updated task document.
 * @throws {ApiError} 404 if not found, 400 if state is not APPROVED/REJECTED.
 */
export const acknowledgeTask = async (taskId, engineerId) => {
  if (!validateObjectId(taskId)) {
    throw new ApiError(400, "Invalid task ID format");
  }

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const task = await Task.findOne({
      _id: taskId,
      engineer: engineerId,
    });

    if (!task) {
      throw new ApiError(404, "Task not found or not assigned to you");
    }

    if (task.status !== "APPROVED" && task.status !== "REJECTED") {
      throw new ApiError(
        400,
        `Only approved or rejected tasks can be acknowledged (current: ${task.status})`
      );
    }

    const beforeState = task.status;
    const afterState = "RESOLVED";

    // --- State transition ---
    task.status = afterState;
    await task.save({ session });

    // Audit entry records which decision was acknowledged
    await AuditLog.create(
      [
        {
          task: task._id,
          actor: engineerId,
          action: "TASK_ACKNOWLEDGED",
          beforeState,
          afterState,
          metadata: { acknowledgedDecision: beforeState },
        },
      ],
      { session }
    );

    await session.commitTransaction();
    return task;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
};

/**
 * Resubmit a rejected task for review (Engineer action).
 *
 * Transitions REJECTED → IN_PROGRESS so the engineer can make changes
 * and submit again. Produces an audit entry only.
 *
 * @param {string} taskId     - ObjectId of the task.
 * @param {string} engineerId - ObjectId of the engineer.
 * @returns {Task} Updated task document.
 * @throws {ApiError} 404 if not found, 400 if not in REJECTED state.
 */
export const resubmitTask = async (taskId, engineerId) => {
  if (!validateObjectId(taskId)) {
    throw new ApiError(400, "Invalid task ID format");
  }

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const task = await Task.findOne({
      _id: taskId,
      engineer: engineerId,
    });

    if (!task) {
      throw new ApiError(404, "Task not found or not assigned to you");
    }

    if (task.status !== "REJECTED") {
      throw new ApiError(
        400,
        `Only rejected tasks can be resubmitted (current: ${task.status})`
      );
    }

    const beforeState = task.status;
    const afterState = "IN_PROGRESS";

    // --- State transition ---
    task.status = afterState;
    await task.save({ session });

    await AuditLog.create(
      [
        {
          task: task._id,
          actor: engineerId,
          action: "TASK_RESUBMITTED",
          beforeState,
          afterState,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    return task;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
};
