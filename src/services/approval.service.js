/**
 * Approval workflow service.
 *
 * Manages the approve → acknowledge and reject → resubmit/acknowledge
 * portions of the task lifecycle.
 *
 * Operations:
 *   - approveTask:     SUBMITTED → APPROVED  (audit + notification + mail)
 *   - rejectTask:      SUBMITTED → REJECTED  (audit + notification + mail)
 *   - acknowledgeTask: APPROVED/REJECTED → RESOLVED (audit only)
 *   - resubmitTask:    REJECTED → IN_PROGRESS (audit only)
 *
 * NOTE on transactions: these operations intentionally use plain sequential
 * writes instead of MongoDB multi-document transactions so the API works on
 * ANY MongoDB deployment (including standalone servers, which do not support
 * transactions — they require a replica set). The writes are performed in the
 * order required by the spec: 1. audit entry, 2. notification, 3. mail outbox.
 * If full atomicity is needed, run MongoDB as a (single-node) replica set and
 * wrap each operation in a session/transaction.
 */
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
 * @throws {ApiError} 400 if the ID is invalid or task is not SUBMITTED.
 * @throws {ApiError} 404 if the task is not found or not managed by you.
 */
export const approveTask = async (taskId, managerId) => {
  if (!validateObjectId(taskId)) {
    throw new ApiError(400, "Invalid task ID format");
  }

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
  await task.save();

  // 1. Audit entry
  await AuditLog.create({
    task: task._id,
    actor: managerId,
    action: "TASK_APPROVED",
    beforeState,
    afterState,
  });

  // 2. In-app notification for the engineer
  await Notification.create({
    recipient: task.engineer._id,
    task: task._id,
    type: "TASK_APPROVED",
    title: "Task approved",
    message: `Your task "${task.title}" has been approved.`,
  });

  // 3. Mail outbox record (simulated email)
  await MailOutbox.create({
    task: task._id,
    recipient: task.engineer.email,
    subject: `Task approved: ${task.title}`,
    body: `Your task "${task.title}" has been approved by the manager.`,
    deliveryState: "PENDING",
  });

  return task;
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
 * @throws {ApiError} 400 if the ID is invalid or task is not SUBMITTED.
 * @throws {ApiError} 404 if the task is not found or not managed by you.
 */
export const rejectTask = async (taskId, managerId, rejectionReason) => {
  if (!validateObjectId(taskId)) {
    throw new ApiError(400, "Invalid task ID format");
  }

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
  await task.save();

  // 1. Audit entry (stores rejection reason in metadata)
  await AuditLog.create({
    task: task._id,
    actor: managerId,
    action: "TASK_REJECTED",
    beforeState,
    afterState,
    metadata: { reason: rejectionReason || null },
  });

  // 2. In-app notification
  await Notification.create({
    recipient: task.engineer._id,
    task: task._id,
    type: "TASK_REJECTED",
    title: "Task rejected",
    message: rejectionReason
      ? `Your task "${task.title}" was rejected: ${rejectionReason}`
      : `Your task "${task.title}" was rejected.`,
  });

  // 3. Mail outbox record
  await MailOutbox.create({
    task: task._id,
    recipient: task.engineer.email,
    subject: `Task rejected: ${task.title}`,
    body: rejectionReason
      ? `Your task "${task.title}" was rejected. Reason: ${rejectionReason}`
      : `Your task "${task.title}" was rejected.`,
    deliveryState: "PENDING",
  });

  return task;
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
 * @throws {ApiError} 400 if the ID is invalid or state is not APPROVED/REJECTED.
 * @throws {ApiError} 404 if the task is not found or not assigned to you.
 */
export const acknowledgeTask = async (taskId, engineerId) => {
  if (!validateObjectId(taskId)) {
    throw new ApiError(400, "Invalid task ID format");
  }

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
  await task.save();

  // Audit entry records which decision was acknowledged
  await AuditLog.create({
    task: task._id,
    actor: engineerId,
    action: "TASK_ACKNOWLEDGED",
    beforeState,
    afterState,
    metadata: { acknowledgedDecision: beforeState },
  });

  return task;
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
 * @throws {ApiError} 400 if the ID is invalid or task is not REJECTED.
 * @throws {ApiError} 404 if the task is not found or not assigned to you.
 */
export const resubmitTask = async (taskId, engineerId) => {
  if (!validateObjectId(taskId)) {
    throw new ApiError(400, "Invalid task ID format");
  }

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
  await task.save();

  await AuditLog.create({
    task: task._id,
    actor: engineerId,
    action: "TASK_RESUBMITTED",
    beforeState,
    afterState,
  });

  return task;
};
