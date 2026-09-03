/**
 * Task service.
 *
 * Handles task lifecycle operations: creation, listing, starting, and
 * submission. Each state transition is validated against the task state
 * machine and logged to the audit trail.
 *
 * Task state machine:
 *   NOT_STARTED → IN_PROGRESS → SUBMITTED → (approval workflow)
 */
import User from "../models/User.js";
import Task from "../models/Task.js";
import AuditLog from "../models/AuditLog.js";
import ApiError from "../utils/ApiError.js";
import {
  validateRequiredFields,
  validateEnum,
  validateObjectId,
} from "../utils/validators.js";

/**
 * Fetch audit log entries for a specific task.
 *
 * Any authenticated user with access to the task (manager or engineer)
 * can view the audit trail.
 *
 * @param {string} taskId   - ObjectId of the task.
 * @param {string} userId   - ObjectId of the requesting user.
 * @returns {AuditLog[]} Array of audit log entries, oldest first.
 * @throws {ApiError} 403 if user has no access to the task.
 */
export const getTaskAuditLogs = async (taskId, userId) => {
  if (!validateObjectId(taskId)) {
    throw new ApiError(400, "Invalid task ID format");
  }

  // Verify the user has access to this task
  const task = await Task.findById(taskId);

  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  const isManager = task.manager.toString() === userId;
  const isEngineer = task.engineer.toString() === userId;

  if (!isManager && !isEngineer) {
    throw new ApiError(403, "You do not have access to this task");
  }

  return AuditLog.find({ task: taskId })
    .populate("actor", "name email role")
    .sort({ createdAt: 1 });
};

/**
 * Create a new task and assign it to an engineer.
 *
 * The manager is taken from the authenticated user (req.user).
 * An audit entry is created for TASK_CREATED.
 *
 * @param {object}  param0
 * @param {string}  param0.title       - Task title (3-200 chars).
 * @param {string}  param0.description - Task description.
 * @param {string}  param0.dueDate     - ISO date string for the deadline.
 * @param {string}  param0.priority    - LOW, MEDIUM, or HIGH.
 * @param {string}  param0.engineerId  - ObjectId of the assigned engineer.
 * @param {string}  param0.managerId   - ObjectId of the creating manager.
 * @returns {object} Created task document.
 * @throws {ApiError} 400 if validation fails, 404 if engineer not found.
 */
export const createTask = async ({
  title,
  description,
  dueDate,
  priority,
  engineerId,
  managerId,
}) => {
  // --- Input validation ---
  validateRequiredFields({ title, description, dueDate, engineerId }, [
    "title",
    "description",
    "dueDate",
    "engineerId",
  ]);

  if (title.length < 3 || title.length > 200) {
    throw new ApiError(400, "Title must be between 3 and 200 characters");
  }

  if (!validateObjectId(engineerId)) {
    throw new ApiError(400, "Invalid engineer ID format");
  }

  validateEnum(priority, ["LOW", "MEDIUM", "HIGH"], "priority");

  // Validate the due date is a valid date in the future
  const parsedDueDate = new Date(dueDate);
  if (isNaN(parsedDueDate.getTime())) {
    throw new ApiError(400, "Invalid due date format");
  }

  // --- Verify the assigned user is an engineer ---
  const engineer = await User.findOne({
    _id: engineerId,
    role: "ENGINEER",
  });

  if (!engineer) {
    throw new ApiError(404, "Assigned user is not a valid engineer");
  }

  // --- Create task ---
  const task = await Task.create({
    title,
    description,
    dueDate: parsedDueDate,
    priority: priority || "MEDIUM",
    manager: managerId,
    engineer: engineerId,
  });

  // --- Audit: TASK_CREATED ---
  await AuditLog.create({
    task: task._id,
    actor: managerId,
    action: "TASK_CREATED",
    beforeState: null,
    afterState: "NOT_STARTED",
    metadata: { assignedTo: engineerId },
  });

  return task;
};

/**
 * List all tasks assigned to a specific engineer, newest first.
 *
 * @param {string} engineerId - ObjectId of the engineer.
 * @returns {Task[]} Array of task documents.
 */
export const getMyTasks = async (engineerId) => {
  return Task.find({ engineer: engineerId }).sort({ createdAt: -1 });
};

/**
 * List all tasks created by a specific manager, newest first.
 *
 * @param {string} managerId - ObjectId of the manager.
 * @returns {Task[]} Array of task documents.
 */
export const getManagedTasks = async (managerId) => {
  return Task.find({ manager: managerId }).sort({ createdAt: -1 });
};

/**
 * Get a single task by ID, verifying the requester has access.
 *
 * Access is granted if the user is the manager who created the task
 * or the engineer it is assigned to.
 *
 * @param {string} taskId    - ObjectId of the task.
 * @param {string} userId    - ObjectId of the requesting user.
 * @param {string} userRole  - Role of the requesting user.
 * @returns {Task} Task document (with populated manager & engineer).
 * @throws {ApiError} 404 if not found or user has no access.
 */
export const getTaskById = async (taskId, userId, userRole) => {
  if (!validateObjectId(taskId)) {
    throw new ApiError(400, "Invalid task ID format");
  }

  const task = await Task.findById(taskId)
    .populate("manager", "name email role")
    .populate("engineer", "name email role");

  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  // Check access: user must be the assigned manager or engineer
  const isManager = task.manager._id.toString() === userId;
  const isEngineer = task.engineer._id.toString() === userId;

  if (!isManager && !isEngineer) {
    throw new ApiError(403, "You do not have access to this task");
  }

  return task;
};

/**
 * Transition a task from NOT_STARTED to IN_PROGRESS.
 *
 * Validates that the task belongs to the engineer and is in the correct
 * starting state. Creates an audit entry for TASK_STARTED.
 *
 * @param {string} taskId     - ObjectId of the task.
 * @param {string} engineerId - ObjectId of the engineer.
 * @returns {Task} Updated task document.
 * @throws {ApiError} 404 if not found, 400 if state transition is invalid.
 */
export const startTask = async (taskId, engineerId) => {
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

  if (task.status !== "NOT_STARTED") {
    throw new ApiError(
      400,
      `Task cannot be started in its current state (${task.status})`
    );
  }

  // --- State transition ---
  const beforeState = task.status;
  task.status = "IN_PROGRESS";
  await task.save();

  // --- Audit: TASK_STARTED ---
  await AuditLog.create({
    task: task._id,
    actor: engineerId,
    action: "TASK_STARTED",
    beforeState,
    afterState: "IN_PROGRESS",
  });

  return task;
};

/**
 * Transition a task from IN_PROGRESS to SUBMITTED (for manager review).
 *
 * Validates that the task belongs to the engineer and is in progress.
 * Creates an audit entry for TASK_SUBMITTED.
 *
 * @param {string} taskId     - ObjectId of the task.
 * @param {string} engineerId - ObjectId of the engineer.
 * @returns {Task} Updated task document.
 * @throws {ApiError} 404 if not found, 400 if state transition is invalid.
 */
export const submitTask = async (taskId, engineerId) => {
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

  if (task.status !== "IN_PROGRESS") {
    throw new ApiError(
      400,
      `Only in-progress tasks can be submitted (current: ${task.status})`
    );
  }

  // --- State transition ---
  const beforeState = task.status;
  task.status = "SUBMITTED";
  await task.save();

  // --- Audit: TASK_SUBMITTED ---
  await AuditLog.create({
    task: task._id,
    actor: engineerId,
    action: "TASK_SUBMITTED",
    beforeState,
    afterState: "SUBMITTED",
  });

  return task;
};
